import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const { chatId, cutoffIndex } = await req.json();

  if (!chatId || typeof cutoffIndex !== "number") {
    return NextResponse.json(
      { error: "chatId and cutoffIndex are required" },
      { status: 400 }
    );
  }

  // Verify the user owns this chat
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
  });

  if (!chat || chat.userId !== user.id) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  // Fetch all messages ordered by createdAt ASC
  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
  });

  if (cutoffIndex < 0 || cutoffIndex >= messages.length) {
    return NextResponse.json(
      { error: "Invalid cutoffIndex" },
      { status: 400 }
    );
  }

  const cutoffMessage = messages[cutoffIndex];

  // Delete all messages with createdAt strictly greater than the cutoff message
  await prisma.message.deleteMany({
    where: {
      chatId,
      createdAt: { gt: cutoffMessage.createdAt },
    },
  });

  return NextResponse.json({ success: true });
}
