import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import crypto from "crypto";

/**
 * GET /api/vercel/authorize
 * Инициирует OAuth flow с Vercel
 * Генерирует state и редиректит на Vercel для авторизации
 * 
 * Документация: https://vercel.com/docs/integrations/create-integration
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.email) {
      // Для popup — показываем страницу с ошибкой
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head><title>Ошибка</title></head>
          <body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h2>Необходима авторизация</h2>
            <p>Пожалуйста, войдите в Moonely перед подключением Vercel.</p>
            <script>
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>`,
        { 
          status: 401,
          headers: { "Content-Type": "text/html" }
        }
      );
    }

    const clientId = process.env.VERCEL_CLIENT_ID;
    const redirectUri = process.env.VERCEL_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error("[Vercel OAuth] Missing VERCEL_CLIENT_ID or VERCEL_REDIRECT_URI");
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head><title>Ошибка настройки</title></head>
          <body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h2>Vercel OAuth не настроен</h2>
            <p>Обратитесь к администратору.</p>
            <script>
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>`,
        { 
          status: 500,
          headers: { "Content-Type": "text/html" }
        }
      );
    }

    // Генерируем state для защиты от CSRF
    const state = crypto.randomBytes(32).toString("hex");

    // Vercel Integrations используют другой URL (не стандартный OAuth)
    // https://vercel.com/docs/integrations/create-integration#oauth2-authorization
    const authUrl = `https://vercel.com/integrations/moonely/new?state=${state}`;

    // Сохраняем state в cookie для проверки при callback
    const response = NextResponse.redirect(authUrl);

    // Устанавливаем cookie с state (httpOnly для безопасности)
    response.cookies.set("vercel_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 минут
      path: "/",
    });

    return response;

  } catch (error) {
    console.error("[Vercel OAuth] Authorize error:", error);
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head><title>Ошибка</title></head>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h2>Произошла ошибка</h2>
          <p>Попробуйте ещё раз.</p>
          <script>
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
      </html>`,
      { 
        status: 500,
        headers: { "Content-Type": "text/html" }
      }
    );
  }
}
