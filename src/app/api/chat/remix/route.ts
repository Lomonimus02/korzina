import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const { showcaseId } = await req.json();

    if (!showcaseId) {
      return NextResponse.json(
        { error: "showcaseId is required" },
        { status: 400 }
      );
    }

    // Get the showcase item
    const showcaseItem = await prisma.showcaseItem.findUnique({
      where: { id: showcaseId },
    });

    if (!showcaseItem) {
      return NextResponse.json(
        { error: "Showcase item not found" },
        { status: 404 }
      );
    }

    // Create a new chat for the user
    const newChatId = uuidv4();
    const newChat = await prisma.chat.create({
      data: {
        id: newChatId,
        userId: user.id,
        title: `Remix: ${showcaseItem.title}`,
      },
    });

    // Get the files snapshot and create an initial assistant message
    // This seeds the chat so the CodeViewer can display the template
    const filesSnapshot = showcaseItem.filesSnapshot as Record<string, string>;
    
    // Convert files to XML format that the parser understands
    // Using <file path="..."> format which is what parseXmlToFiles expects
    const xmlContent = Object.entries(filesSnapshot)
      .map(([path, content]) => `<file path="${path}">\n${content}\n</file>`)
      .join("\n\n");

    const assistantMessage = `Ваш шаблон "${showcaseItem.title}" готов к настройке. Напишите, что хотите изменить!\n<boltArtifact id="remix-${newChatId}" title="${showcaseItem.title}">\n${xmlContent}\n</boltArtifact>`;

    // Create the initial assistant message
    await prisma.message.create({
      data: {
        chatId: newChat.id,
        role: "assistant",
        content: assistantMessage,
      },
    });

    return NextResponse.json({ newChatId: newChat.id });
  } catch (error) {
    console.error("Error remixing showcase:", error);
    return NextResponse.json(
      { error: "Failed to remix showcase" },
      { status: 500 }
    );
  }
}
