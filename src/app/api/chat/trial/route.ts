import prisma from "@/lib/db";
import { headers } from "next/headers";
import { generateRepoMap } from "@/lib/repo-map";
import { getSystemPrompt, buildFilesContext } from "@/lib/system-prompt";
import { calculateCost } from "@/lib/pricing";

export const maxDuration = 60;

/**
 * POST /api/chat/trial
 * 
 * Анонимная trial-генерация: один бесплатный промпт без регистрации.
 * - Проверяет IP в таблице AnonymousTrial
 * - Создаёт Chat без userId, с trialToken
 * - Стримит ответ от ИИ
 * - Записывает trial в БД
 * 
 * Возвращает заголовок X-Trial-Token с токеном для cookie.
 */
export async function POST(req: Request) {
  try {
    // === 1. Получаем IP пользователя ===
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";

    // === 2. Проверяем: не использовал ли этот IP уже trial ===
    const existingTrial = await prisma.anonymousTrial.findFirst({
      where: { ipAddress: ip },
    });

    if (existingTrial) {
      return Response.json(
        { 
          error: "Trial уже использован", 
          message: "Вы уже использовали бесплатную пробную генерацию. Зарегистрируйтесь для продолжения.",
          chatId: existingTrial.chatId, // Возвращаем ID существующего чата
        },
        { status: 403 }
      );
    }

    // === 3. Проверяем: может быть, у пользователя уже есть trialToken в cookie ===
    const cookieHeader = headersList.get("cookie") || "";
    const trialTokenMatch = cookieHeader.match(/moonely_trial_token=([^;]+)/);
    if (trialTokenMatch) {
      // Уже есть токен — проверяем, есть ли чат
      const existingChat = await prisma.chat.findUnique({
        where: { trialToken: trialTokenMatch[1] },
      });
      if (existingChat) {
        return Response.json(
          { 
            error: "Trial уже использован",
            message: "Вы уже использовали бесплатную пробную генерацию. Зарегистрируйтесь для продолжения.",
            chatId: existingChat.id,
          },
          { status: 403 }
        );
      }
    }

    // === 4. Читаем промпт из запроса ===
    const { messages, currentFiles } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Invalid messages format" }, { status: 400 });
    }

    // Ограничиваем: trial = только 1 сообщение
    if (messages.length > 1) {
      return Response.json({ error: "Trial позволяет только 1 промпт" }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    // Извлекаем аттачменты из сообщения
    const attachments: { url: string; name: string }[] = lastMessage?.attachments || [];
    
    if (!lastMessage || lastMessage.role !== "user" || (!lastMessage.content?.trim() && attachments.length === 0)) {
      return Response.json({ error: "Пустое сообщение" }, { status: 400 });
    }

    // Проверка на опасные паттерны (та же что в основном chat)
    const dangerousPatterns = [
      /\$\(\s*(curl|wget|bash|sh|nc|cat|rm|chmod)/gi,
      /\|\s*(bash|sh|zsh)\s*$/gim,
      /;\s*(curl|wget|bash|sh|nc|netcat)\s+/gi,
      /&&\s*(curl|wget|bash|sh)\s+/gi,
      />\s*\/dev\/(tcp|udp)/gi,
      /\beval\s*\(\s*["'`]/gi,
    ];

    if (typeof lastMessage.content === 'string') {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(lastMessage.content)) {
          return Response.json({ error: "Message contains prohibited content" }, { status: 400 });
        }
      }
    }

    // === 5. Создаём trialToken ===
    const trialToken = crypto.randomUUID();

    // === 6. Создаём чат в БД (без userId, с trialToken) ===
    const title = typeof lastMessage.content === 'string' 
      ? lastMessage.content.slice(0, 50) 
      : "Trial Project";
    
    const chat = await prisma.chat.create({
      data: {
        trialToken,
        title,
        // userId: null — анонимный чат
      },
    });

    // Сохраняем сообщение пользователя
    await prisma.message.create({
      data: {
        chatId: chat.id,
        role: "user",
        content: lastMessage.content,
      },
    });

    // === 7. Записываем trial в БД (защита от повторного использования) ===
    await prisma.anonymousTrial.create({
      data: {
        ipAddress: ip,
        chatId: chat.id,
      },
    });

    // === 8. Отправляем запрос к ИИ ===
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response("Missing API Key", { status: 500 });
    }

    // Формируем system prompt (та же логика что в основном chat)
    const repoMap = currentFiles ? generateRepoMap(currentFiles) : '';
    const filesContext = buildFilesContext(currentFiles);
    const systemPrompt = getSystemPrompt(repoMap, filesContext);

    // Формируем контент сообщения с учётом аттачментов
    const hasAttachments = attachments.length > 0;
    let userContent: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;

    if (hasAttachments) {
      // Формируем attachment context (как в основном API)
      let attachmentContext = `\n=== USER ATTACHMENTS AVAILABLE ===\nThe user has attached the following files. You have two ways to use them:\n1. **VISUAL REFERENCE**: Use them to analyze design, layout, colors, typography, and components.\n2. **ASSETS**: If the user asks to "use this image", "place this logo", or "embed this", YOU MUST use the exact URL provided below in your <img> tags.\n\n`;
      attachments.forEach((att: { name: string; url: string }, index: number) => {
        attachmentContext += `File ${index + 1}: Name: "${att.name}" -> URL: "${att.url}"\n`;
      });
      attachmentContext += `\nIMPORTANT: When using these as assets in code, use the EXACT URLs above in <img src="..."> tags.\nExample: <img src="${attachments[0].url}" alt="${attachments[0].name}" className="..." />\n\n`;

      const textContent = `${attachmentContext}User message: ${lastMessage.content || "Проанализируй это изображение и создай код на его основе."}`;
      userContent = [
        { type: "text" as const, text: textContent },
      ];
      for (const att of attachments) {
        userContent.push({
          type: "image_url" as const,
          image_url: { url: att.url },
        });
      }
    } else {
      userContent = lastMessage.content as string;
    }

    const messagesToSend = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userContent },
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Moonely",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: messagesToSend,
        stream: true,
        stream_options: { include_usage: true },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter error (trial):", errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    // === 9. Стримим ответ ===
    const encoder = new TextEncoder();
    let fullResponse = "";
    const modelId = "google/gemini-3-flash-preview";
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
                  
                  // Extract token usage from the final chunk
                  if (parsed.usage) {
                    promptTokens = parsed.usage.prompt_tokens ?? 0;
                    completionTokens = parsed.usage.completion_tokens ?? 0;
                  }
                  
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    fullResponse += content;
                    controller.enqueue(encoder.encode(content));
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }

          // Сохраняем ответ ассистента в БД
          if (fullResponse) {
            const cost = calculateCost(modelId, promptTokens, completionTokens);
            await prisma.message.create({
              data: {
                chatId: chat.id,
                role: "assistant",
                content: fullResponse,
                promptTokens,
                completionTokens,
                cost,
              },
            });

            // Авто-генерация заголовка
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
                    { role: "user", content: `Generate a short, concise title (max 4 words, in Russian) for this project based on the user's prompt: "${lastMessage.content}". Return ONLY the title text. Do not use quotes.` }
                  ],
                }),
              });

              if (titleResponse.ok) {
                const titleData = await titleResponse.json();
                const generatedTitle = titleData.choices?.[0]?.message?.content?.trim().slice(0, 50);
                if (generatedTitle) {
                  await prisma.chat.update({
                    where: { id: chat.id },
                    data: { title: generatedTitle },
                  });
                }
              }
            } catch (error) {
              console.error("Failed to auto-generate trial title:", error);
            }
          }

          controller.close();
        } catch (error) {
          console.error("Trial stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Chat-Id": chat.id,
        "X-Trial-Token": trialToken,
        // Устанавливаем cookie с trialToken (живёт 30 дней)
        "Set-Cookie": `moonely_trial_token=${trialToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`,
      },
    });
  } catch (error: any) {
    console.error("Trial API Error:", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat/trial
 * 
 * Проверяет статус trial: использован или нет.
 * Если использован — возвращает chatId для показа проекта.
 */
export async function GET(req: Request) {
  try {
    const headersList = await headers();
    
    // Проверяем cookie
    const cookieHeader = headersList.get("cookie") || "";
    const trialTokenMatch = cookieHeader.match(/moonely_trial_token=([^;]+)/);
    
    if (trialTokenMatch) {
      const chat = await prisma.chat.findUnique({
        where: { trialToken: trialTokenMatch[1] },
        select: { id: true, title: true },
      });
      
      if (chat) {
        return Response.json({ 
          used: true, 
          chatId: chat.id,
          title: chat.title,
        });
      }
    }

    // Проверяем по IP
    const forwarded = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";

    const trial = await prisma.anonymousTrial.findFirst({
      where: { ipAddress: ip },
    });

    if (trial && trial.chatId) {
      return Response.json({ 
        used: true, 
        chatId: trial.chatId,
      });
    }

    return Response.json({ used: false });
  } catch (error: any) {
    console.error("Trial check error:", error);
    return Response.json({ used: false });
  }
}
