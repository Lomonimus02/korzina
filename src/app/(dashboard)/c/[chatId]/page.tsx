import { getAuthSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/db";
import ChatInterface from "@/components/chat-interface";
import { UIMessage } from "@ai-sdk/react";

interface ChatPageProps {
  params: Promise<{
    chatId: string;
  }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const session = await getAuthSession();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const { chatId } = await params;

  const chat = await prisma.chat.findUnique({
    where: {
      id: chatId,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!chat) {
    redirect("/");
  }

  // Check ownership
  // Assuming we have user ID in session or we look up user by email
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || chat.userId !== user.id) {
    redirect("/");
  }

  // Convert Prisma messages to AI SDK messages
  const initialMessages: UIMessage[] = chat.messages.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    content: msg.content,
    parts: [{ type: 'text', text: msg.content }],
  }));

  return (
    <ChatInterface 
      key={chatId}
      chatId={chatId} 
      initialMessages={initialMessages} 
      initialTitle={chat.title}
      userData={{
        email: user.email,
        plan: user.plan,
        role: user.role,
      }}
    />
  );
}
