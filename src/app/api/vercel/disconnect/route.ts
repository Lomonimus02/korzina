import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";

/**
 * POST /api/vercel/disconnect
 * Отключает Vercel от аккаунта пользователя (удаляет сохранённый токен)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    // Удаляем токен из БД
    await prisma.user.update({
      where: { email: session.user.email },
      data: { 
        vercelToken: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Vercel отключён",
    });

  } catch (error) {
    console.error("[Vercel Disconnect] Error:", error);
    return NextResponse.json(
      { error: "Ошибка при отключении Vercel" },
      { status: 500 }
    );
  }
}
