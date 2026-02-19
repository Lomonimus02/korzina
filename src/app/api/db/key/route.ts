import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { ensureProjectKey } from "@/lib/db-utils";

/**
 * GET /api/db/key?projectId=xxx
 * Получает или создает API ключ для проекта
 * Требует авторизации - только владелец проекта может получить ключ
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // Проверяем что проект принадлежит пользователю
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const chat = await prisma.chat.findUnique({
      where: { id: projectId },
    });

    // Если чат существует - проверяем владельца
    if (chat && chat.userId !== user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Получаем или создаем API ключ
    const apiKey = await ensureProjectKey(projectId);

    // Получаем API URL для деплоев
    // Приоритет: MOONELY_PRODUCTION_API_URL > NEXT_PUBLIC_MOONELY_API_URL
    const rawApiUrl = process.env.MOONELY_PRODUCTION_API_URL || process.env.NEXT_PUBLIC_MOONELY_API_URL || '';
    
    // Санитизируем URL
    let apiUrl = rawApiUrl.trim();
    while (apiUrl.endsWith('/')) {
      apiUrl = apiUrl.slice(0, -1);
    }
    if (apiUrl.endsWith('/api/db')) {
      apiUrl = apiUrl.slice(0, -7);
    }

    return NextResponse.json({
      success: true,
      key: apiKey,
      apiUrl: apiUrl,
      projectId: projectId,
      // Deprecated: оставляем для обратной совместимости
      data: { apiKey, projectId },
    });
  } catch (error) {
    console.error("[API /api/db/key] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
