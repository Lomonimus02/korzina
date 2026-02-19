import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { validateVercelToken } from "@/lib/vercel";

/**
 * GET /api/vercel/status
 * Проверяет статус подключения Vercel для текущего пользователя
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        vercelToken: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // Если токена нет — не подключён
    if (!user.vercelToken) {
      return NextResponse.json({
        connected: false,
        reason: "no_token",
      });
    }

    // Проверяем валидность токена
    const isValid = await validateVercelToken(user.vercelToken);

    if (!isValid) {
      return NextResponse.json({
        connected: false,
        reason: "token_expired",
      });
    }

    // Получаем информацию о пользователе Vercel для отображения
    try {
      const userResponse = await fetch("https://api.vercel.com/v2/user", {
        headers: {
          Authorization: `Bearer ${user.vercelToken}`,
        },
      });

      if (userResponse.ok) {
        const vercelUser = await userResponse.json();
        return NextResponse.json({
          connected: true,
          vercelUsername: vercelUser.user?.username,
          vercelEmail: vercelUser.user?.email,
        });
      }
    } catch {
      // Если не удалось получить info — всё равно connected
    }

    return NextResponse.json({
      connected: true,
    });

  } catch (error) {
    console.error("[Vercel Status] Error:", error);
    return NextResponse.json(
      { error: "Ошибка при проверке статуса" },
      { status: 500 }
    );
  }
}
