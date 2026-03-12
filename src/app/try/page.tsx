import { cookies } from "next/headers";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import ChatInterface from "@/components/chat-interface";

// Всегда рендерить серверно — не кешировать
export const dynamic = "force-dynamic";

/**
 * Страница /try — анонимная проба Moonely (1 бесплатный промпт).
 * 
 * Логика:
 * 1. Если пользователь залогинен → отправляем на /new (у него есть аккаунт)
 * 2. Если есть cookie moonely_trial_token → trial использован, 
 *    показываем результат в read-only + баннер "зарегистрируйтесь"
 * 3. Если trial не использован → показываем ChatInterface в trial-режиме
 */
export default async function TryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const session = await getAuthSession();

  // Залогиненный пользователь → на /new
  if (session?.user?.email) {
    const redirectUrl = params.q ? `/new?q=${encodeURIComponent(params.q)}` : "/new";
    return redirect(redirectUrl);
  }

  // Проверяем: trial уже использован?
  const cookieStore = await cookies();
  const trialToken = cookieStore.get("moonely_trial_token")?.value;

  let trialChat: {
    id: string;
    title: string;
    messages: { role: string; content: string }[];
  } | null = null;

  if (trialToken) {
    // Trial использован — загружаем чат для показа результата
    const chat = await prisma.chat.findUnique({
      where: { trialToken },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: { role: true, content: true },
        },
      },
    });

    if (chat) {
      trialChat = {
        id: chat.id,
        title: chat.title,
        messages: chat.messages,
      };
    }
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden relative">
      {/* Фон как в dashboard */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 100% 80% at 50% -30%, rgba(120, 119, 198, 0.4) 0%, transparent 60%), #030303",
        }}
      />
      <main className="flex-1 h-full overflow-hidden relative">
        <ChatInterface
          key={trialChat ? `trial-${trialChat.id}` : "trial-new"}
          chatId={trialChat?.id}
          initialMessages={trialChat?.messages || []}
          initialInput={trialChat ? undefined : params.q}
          initialTitle={trialChat?.title}
          isTrialMode={true}
          trialUsed={!!trialChat}
        />
      </main>
    </div>
  );
}
