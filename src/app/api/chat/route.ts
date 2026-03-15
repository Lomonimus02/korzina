import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { generateRepoMap } from "@/lib/repo-map";
import { getSystemPrompt, buildFilesContext } from "@/lib/system-prompt";
import { FREE_PLAN_LIMITS } from "@/lib/yookassa-types";
import { calculateCost } from "@/lib/pricing";

export const maxDuration = 60;

// OpenRouter Chat Completions format
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return new Response("User not found", { status: 401 });
  }

  // ============================================
  // FREE plan limits check (3/day, 15/month)
  // ============================================
  const now = new Date();
  let updatedUserData = {
    dailyGenerations: user.dailyGenerations,
    monthlyGenerations: user.monthlyGenerations,
    dailyResetAt: user.dailyResetAt,
    monthlyResetAt: user.monthlyResetAt,
  };

  // Reset daily counter if needed
  if (!user.dailyResetAt || now >= user.dailyResetAt) {
    const tomorrowMidnight = new Date(now);
    tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);
    tomorrowMidnight.setHours(0, 0, 0, 0);
    
    updatedUserData.dailyGenerations = 0;
    updatedUserData.dailyResetAt = tomorrowMidnight;
  }

  // Reset monthly counter if needed
  if (!user.monthlyResetAt || now >= user.monthlyResetAt) {
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    
    updatedUserData.monthlyGenerations = 0;
    updatedUserData.monthlyResetAt = nextMonthStart;
  }

  // For FREE plan users - check limits
  if (user.plan === 'FREE') {
    // Check daily limit
    if (updatedUserData.dailyGenerations >= FREE_PLAN_LIMITS.dailyGenerations) {
      return Response.json({ 
        error: "Дневной лимит исчерпан", 
        message: `Бесплатный план: ${FREE_PLAN_LIMITS.dailyGenerations} генерации в день. Обновите тариф для безлимитного доступа.`
      }, { status: 403 });
    }
    
    // Check monthly limit
    if (updatedUserData.monthlyGenerations >= FREE_PLAN_LIMITS.monthlyGenerations) {
      return Response.json({ 
        error: "Месячный лимит исчерпан", 
        message: `Бесплатный план: ${FREE_PLAN_LIMITS.monthlyGenerations} генераций в месяц. Обновите тариф для безлимитного доступа.`
      }, { status: 403 });
    }
  } else {
    // For paid plans - check credits (regular credits or lifetime credits)
    const totalCredits = (user.credits || 0) + (user.lifetimeCredits || 0);
    if (totalCredits <= 0) {
      return Response.json({ error: "Insufficient credits" }, { status: 403 });
    }
  }

  const { messages, currentFiles, chatId, images, attachments } = await req.json();

  // Input validation
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Invalid messages format" }, { status: 400 });
  }

  // Limit image/attachment count
  if (images && images.length > 5) {
    return Response.json({ error: "Too many images (max 5)" }, { status: 400 });
  }
  if (attachments && attachments.length > 5) {
    return Response.json({ error: "Too many attachments (max 5)" }, { status: 400 });
  }

  // SECURITY: Block command injection patterns in user messages
  // Only check USER messages, not assistant responses in history
  const dangerousPatterns = [
    /\$\(\s*(curl|wget|bash|sh|nc|cat|rm|chmod)/gi,  // $(curl...), $(bash...) etc
    /\|\s*(bash|sh|zsh)\s*$/gim,                      // | bash at end of line
    /;\s*(curl|wget|bash|sh|nc|netcat)\s+/gi,        // ; curl <url>, ; wget, etc.
    /&&\s*(curl|wget|bash|sh)\s+/gi,                 // && curl, etc.
    />\s*\/dev\/(tcp|udp)/gi,                        // > /dev/tcp, /dev/udp (reverse shells)
    /\beval\s*\(\s*["'`]/gi,                         // eval("...) - JS injection
  ];

  // Only validate user's NEW message (last one), not entire history
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === 'user' && typeof lastMessage.content === 'string') {
    for (const pattern of dangerousPatterns) {
      if (pattern.test(lastMessage.content)) {
        console.warn(`[SECURITY] Blocked dangerous pattern in message: ${lastMessage.content.substring(0, 100)}`);
        return Response.json({ error: "Message contains prohibited content" }, { status: 400 });
      }
    }
  }

  // Only log in development
  if (process.env.NODE_ENV !== 'production') {
    console.log("Received messages:", JSON.stringify(messages, null, 2));
    console.log("Received images count:", images?.length || 0);
    console.log("Received attachments count:", attachments?.length || 0);
    if (attachments?.length > 0) {
      console.log("Attachments:", attachments.map((a: { name: string; url: string }) => ({ name: a.name, url: a.url.substring(0, 50) + '...' })));
    }
    if (images?.length > 0) {
      console.log("First image preview (first 100 chars):", images[0].substring(0, 100));
    }
  }

  // Chat Persistence Logic
  let activeChatId = chatId;

  if (activeChatId) {
    const chat = await prisma.chat.findFirst({
      where: { id: activeChatId, deletedAt: null },
    });

    if (chat) {
      if (chat.userId !== user.id) {
        return new Response("Chat not found or unauthorized", { status: 404 });
      }
    } else {
      const title = messages[messages.length - 1]?.content.slice(0, 50) || "New Project";
      const newChat = await prisma.chat.create({
        data: {
          id: activeChatId,
          userId: user.id,
          title: title,
        },
      });
      revalidatePath("/", "layout");
      revalidatePath(`/c/${newChat.id}`);
    }
  } else {
    const title = messages[messages.length - 1]?.content.slice(0, 50) || "New Project";
    const newChat = await prisma.chat.create({
      data: {
        userId: user.id,
        title: title,
      },
    });
    activeChatId = newChat.id;
    revalidatePath("/", "layout");
    revalidatePath(`/c/${newChat.id}`);
  }

  // Save User Message
  const lastUserMessage = messages[messages.length - 1];
  if (lastUserMessage && lastUserMessage.role === 'user') {
    await prisma.message.create({
      data: {
        chatId: activeChatId,
        role: "user",
        content: lastUserMessage.content,
      },
    });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENROUTER_API_KEY");
    return new Response("Missing API Key", { status: 401 });
  }

  try {
    // Build messages for OpenRouter Chat Completions API
    const lastMessage = messages[messages.length - 1];
    const hasImages = images && images.length > 0;
    const hasAttachments = attachments && attachments.length > 0;
    
    // Build attachment context for system prompt injection
    let attachmentContext = '';
    if (hasAttachments) {
      attachmentContext = `
=== USER ATTACHMENTS AVAILABLE ===
The user has attached the following files. You have two ways to use them:
1. **VISUAL REFERENCE**: Use them to analyze design, layout, colors, typography, and components.
2. **ASSETS**: If the user asks to "use this image", "place this logo", or "embed this", YOU MUST use the exact URL provided below in your <img> tags.

`;
      attachments.forEach((att: { name: string; url: string }, index: number) => {
        attachmentContext += `File ${index + 1}: Name: "${att.name}" -> URL: "${att.url}"\n`;
      });
      attachmentContext += `
IMPORTANT: When using these as assets in code, use the EXACT URLs above in <img src="..."> tags.
Example: <img src="${attachments[0].url}" alt="${attachments[0].name}" className="..." />

`;
    }
    
    // Build content for last message
    let lastMessageContent: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
    
    if (hasImages || hasAttachments) {
      // OpenRouter/OpenAI Chat Completions format for images
      // Prepend attachment context to the user's message so AI knows what files are available
      const textContent = hasAttachments 
        ? `${attachmentContext}User message: ${lastMessage.content || "Проанализируй это изображение и создай код на его основе."}`
        : lastMessage.content || "Проанализируй это изображение и создай код на его основе.";
      
      lastMessageContent = [
        { type: "text", text: textContent }
      ];
      
      // Add legacy base64 images if present
      if (hasImages) {
        for (const imageBase64 of images) {
          lastMessageContent.push({
            type: "image_url",
            image_url: {
              url: imageBase64, // data:image/jpeg;base64,... format
            }
          });
        }
      }
      
      // Add attachment URLs as image_url for vision models
      if (hasAttachments) {
        for (const attachment of attachments) {
          lastMessageContent.push({
            type: "image_url",
            image_url: {
              url: attachment.url, // Cloud storage URL
            }
          });
        }
      }
    } else {
      lastMessageContent = lastMessage.content;
    }

    // ========== STRUCTURED CONTEXT BUILDING ==========
    const repoMap = currentFiles ? generateRepoMap(currentFiles) : '';
    const filesContext = buildFilesContext(currentFiles);
    const systemPrompt = getSystemPrompt(repoMap, filesContext);

    // Build messages array with a Sliding Window (last 15 messages)
    const MAX_HISTORY = 15;
    const historyMessages = messages.slice(0, -1); // Exclude the current new message
    const recentHistory = historyMessages.slice(-MAX_HISTORY).map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content as string,
    }));

    // We always send: System Prompt -> Recent History -> Newest Message
    let messagesToSend: ChatMessage[];
    messagesToSend = [
      { role: "system", content: systemPrompt },
      ...recentHistory,
      { role: "user", content: lastMessageContent }
    ];

    console.log("Sending to OpenRouter:", JSON.stringify(messagesToSend.map(m => ({ role: m.role, contentType: typeof m.content === 'string' ? 'string' : 'array' })), null, 2));

    // Call OpenRouter Chat Completions API directly
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Moonely",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview", // Gemini 3 Flash Preview
        messages: messagesToSend,
        stream: true,
        stream_options: { include_usage: true },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter error:", errorText);
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    // Increment generation counters for ALL users (tracking purposes)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        dailyGenerations: { increment: 1 },
        monthlyGenerations: { increment: 1 },
        dailyResetAt: updatedUserData.dailyResetAt,
        monthlyResetAt: updatedUserData.monthlyResetAt,
      },
    });

    // Deduct credits for paid plans
    if (user.plan !== 'FREE') {
      // For paid plans - deduct credits (priority: lifetime credits first, then regular credits)
      if ((user.lifetimeCredits || 0) > 0) {
        // Use lifetime credits first
        const updatedUser = await prisma.user.updateMany({
          where: { 
            id: user.id,
            lifetimeCredits: { gt: 0 }
          },
          data: { lifetimeCredits: { decrement: 1 } },
        });
        
        if (updatedUser.count === 0) {
          // Fall back to regular credits
          const fallbackUpdate = await prisma.user.updateMany({
            where: { 
              id: user.id,
              credits: { gt: 0 }
            },
            data: { credits: { decrement: 1 } },
          });
          
          if (fallbackUpdate.count === 0) {
            return Response.json({ error: "Insufficient credits" }, { status: 403 });
          }
        }
      } else {
        // Use regular credits
        const updatedUser = await prisma.user.updateMany({
          where: { 
            id: user.id,
            credits: { gt: 0 }
          },
          data: { credits: { decrement: 1 } },
        });

        if (updatedUser.count === 0) {
          return Response.json({ error: "Insufficient credits" }, { status: 403 });
        }
      }
    }

    // Create a streaming response
    const encoder = new TextEncoder();
    let fullResponse = "";
    const modelId = "google/gemini-3-flash-preview";

    // Token usage tracking
    let promptTokens = 0;
    let completionTokens = 0;

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);

                  // Extract token usage from the final chunk (OpenAI stream format)
                  if (parsed.usage) {
                    promptTokens = parsed.usage.prompt_tokens ?? 0;
                    completionTokens = parsed.usage.completion_tokens ?? 0;
                  }

                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    fullResponse += content;
                    controller.enqueue(encoder.encode(content));
                  }
                } catch (e) {
                  // Ignore parse errors for incomplete chunks
                }
              }
            }
          }

          // Save assistant message with token usage after streaming completes
          if (activeChatId && fullResponse) {
            const cost = calculateCost(modelId, promptTokens, completionTokens);
            await prisma.message.create({
              data: {
                chatId: activeChatId,
                role: "assistant",
                content: fullResponse,
                promptTokens,
                completionTokens,
                cost,
              },
            });

            // Auto-title for new chats
            if (messages.length === 1) {
              try {
                const titleResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    model: "google/gemini-2.0-flash-001",
                    messages: [
                      { role: "system", content: "You are a helpful assistant that generates concise project titles." },
                      { role: "user", content: `Generate a short, concise title (max 4 words, in Russian) for this project based on the user's prompt: "${messages[0].content}". Return ONLY the title text. Do not use quotes.` }
                    ],
                  }),
                });

                if (titleResponse.ok) {
                  const titleData = await titleResponse.json();
                  const generatedTitle = titleData.choices?.[0]?.message?.content?.trim().slice(0, 50);
                  
                  if (generatedTitle) {
                    await prisma.chat.update({
                      where: { id: activeChatId },
                      data: { title: generatedTitle },
                    });
                    revalidatePath("/", "layout");
                    revalidatePath(`/c/${activeChatId}`);
                  }
                }
              } catch (error) {
                console.error("Failed to auto-generate title:", error);
              }
            }
          }

          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Chat-Id": activeChatId,
      },
    });

  } catch (error: any) {
    console.error("API Error:", error);
    const errorMessage = error.message || "Failed to process request";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
