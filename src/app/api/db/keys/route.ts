import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";
import crypto from "crypto";

function generateApiKey(): string {
  return `mk_${crypto.randomBytes(24).toString("hex")}`;
}

// GET - Получить API ключ для проекта (если есть)
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    // Проверяем владение проектом
    const chat = await prisma.chat.findFirst({
      where: { id: projectId, userId: userId, deletedAt: null },
    });

    if (!chat) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const apiKey = await prisma.projectApiKey.findUnique({
      where: { projectId: projectId },
    });

    return NextResponse.json({
      success: true,
      data: apiKey ? { id: apiKey.id, key: apiKey.key, createdAt: apiKey.createdAt } : null,
    });
  } catch (error) {
    console.error("Get API key error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST - Создать или пересоздать API ключ для проекта
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    // Проверяем владение проектом
    const chat = await prisma.chat.findFirst({
      where: { id: projectId, userId: userId, deletedAt: null },
    });

    if (!chat) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Удаляем старый ключ если есть
    await prisma.projectApiKey.deleteMany({
      where: { projectId: projectId },
    });

    // Создаём новый ключ
    const newKey = generateApiKey();
    const apiKey = await prisma.projectApiKey.create({
      data: {
        projectId: projectId,
        key: newKey,
      },
    });

    return NextResponse.json({
      success: true,
      data: { id: apiKey.id, key: apiKey.key, createdAt: apiKey.createdAt },
    });
  } catch (error) {
    console.error("Create API key error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE - Удалить API ключ проекта
export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    // Проверяем владение проектом
    const chat = await prisma.chat.findFirst({
      where: { id: projectId, userId: userId, deletedAt: null },
    });

    if (!chat) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.projectApiKey.deleteMany({
      where: { projectId: projectId },
    });

    return NextResponse.json({ success: true, message: "API key deleted" });
  } catch (error) {
    console.error("Delete API key error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
