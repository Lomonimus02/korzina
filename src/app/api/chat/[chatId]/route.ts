import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { chatId } = await params;

  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { userId: true },
    });

    if (!chat) {
      return new NextResponse("Chat not found", { status: 404 });
    }

    // Verify ownership
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user || chat.userId !== user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Soft-delete: mark chat and messages as deleted (preserve data for admin stats)
    const now = new Date();
    await prisma.message.updateMany({
      where: { chatId: chatId },
      data: { deletedAt: now },
    });

    await prisma.chat.update({
      where: { id: chatId },
      data: { deletedAt: now },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete chat error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { chatId } = await params;
  const json = await req.json();
  const { title } = json;

  if (!title) {
    return new NextResponse("Title is required", { status: 400 });
  }

  try {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, deletedAt: null },
      select: { userId: true },
    });

    if (!chat) {
      return new NextResponse("Chat not found", { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user || chat.userId !== user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: { title },
    });

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error("Update chat error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
