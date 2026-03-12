import prisma from "@/lib/db";
import { headers } from "next/headers";
import { generateRepoMap } from "@/lib/repo-map";
import { getSystemPrompt, buildFilesContext } from "@/lib/system-prompt";
import { calculateCost } from "@/lib/pricing";

export const maxDuration = 60;

/**
 * POST /api/chat/trial/fix
 * 
 * Автоматическое исправление ошибок в trial-генерации.
 * - Проверяет trialToken из cookie
 * - Находит существующий trial-чат и его сообщения
 * - Отправляет fix-запрос к OpenRouter с контекстом ошибки
 * - Стримит исправленный ответ
 * - Ограничение: 1 фикс на trial
 */
export async function POST(req: Request) {
  try {
    // === 1. Проверяем trialToken из cookie ===
    const headersList = await headers();
    const cookieHeader = headersList.get("cookie") || "";
    const trialTokenMatch = cookieHeader.match(/moonely_trial_token=([^;]+)/);

    if (!trialTokenMatch) {
      return Response.json(
        { error: "Trial token not found" },
        { status: 401 }
      );
    }

    const trialToken = trialTokenMatch[1];

    // === 2. Находим trial-чат ===
    const chat = await prisma.chat.findUnique({
      where: { trialToken },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!chat) {
      return Response.json(
        { error: "Trial chat not found" },
        { status: 404 }
      );
    }

    // === 3. Проверяем лимит фиксов (макс 1) ===
    // Считаем количество сообщений пользователя — если больше 1, значит фикс уже был
    const userMessages = chat.messages.filter(m => m.role === "user");
    if (userMessages.length > 1) {
      return Response.json(
        { error: "Fix already used", message: "Автоматическое исправление уже было использовано." },
        { status: 403 }
      );
    }

    // === 4. Читаем данные из запроса ===
    const { errorMessage, currentFiles } = await req.json();

    if (!errorMessage) {
      return Response.json({ error: "Error message is required" }, { status: 400 });
    }

    // === 5. Сохраняем fix-сообщение пользователя ===
    const fixContent = `Исправь ошибку в коде: ${errorMessage}`;
    await prisma.message.create({
      data: {
        chatId: chat.id,
        role: "user",
        content: fixContent,
      },
    });

    // === 6. Отправляем запрос к ИИ ===
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response("Missing API Key", { status: 500 });
    }

    // Формируем контекст файлов
    const repoMap = currentFiles ? generateRepoMap(currentFiles) : '';
    const filesContext = buildFilesContext(currentFiles);
    const systemPrompt = getSystemPrompt(repoMap, filesContext);

    // Собираем историю: system + оригинальный промпт + ответ ассистента + fix-запрос
    const assistantMessage = chat.messages.find(m => m.role === "assistant");
    const originalUserMessage = chat.messages.find(m => m.role === "user");

    const messagesToSend = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: originalUserMessage?.content || "" },
      ...(assistantMessage ? [{ role: "assistant" as const, content: assistantMessage.content }] : []),
      { role: "user" as const, content: fixContent },
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
      console.error("OpenRouter error (trial fix):", errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    // === 7. Стримим ответ ===
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
          }

          controller.close();
        } catch (error) {
          console.error("Trial fix stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Chat-Id": chat.id,
      },
    });
  } catch (error: any) {
    console.error("Trial Fix API Error:", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
