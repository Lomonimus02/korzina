import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";

/**
 * Генерирует HTML страницу для popup окна
 */
function popupResponse(success: boolean, message: string, username?: string) {
  const bgColor = success ? "#10b981" : "#ef4444";
  const icon = success ? "✓" : "✗";
  
  return new NextResponse(
    `<!DOCTYPE html>
    <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${success ? "Vercel подключён" : "Ошибка"}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #18181b;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .container {
            text-align: center;
            padding: 40px;
          }
          .icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: ${bgColor};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            margin: 0 auto 20px;
          }
          h2 { margin: 0 0 10px; }
          p { color: #a1a1aa; margin: 0; }
          .username { color: #60a5fa; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">${icon}</div>
          <h2>${success ? "Vercel подключён!" : "Ошибка подключения"}</h2>
          <p>${message}</p>
          ${username ? `<p class="username">@${username}</p>` : ""}
          <p style="margin-top: 20px; font-size: 14px;">Это окно закроется автоматически...</p>
        </div>
        <script>
          // Уведомляем родительское окно и закрываем popup
          if (window.opener) {
            window.opener.postMessage({ type: 'vercel_oauth', success: ${success} }, '*');
          }
          setTimeout(() => window.close(), 2000);
        </script>
      </body>
    </html>`,
    { 
      headers: { "Content-Type": "text/html; charset=utf-8" }
    }
  );
}

/**
 * GET /api/vercel/callback
 * Обрабатывает callback от Vercel OAuth
 * Обменивает authorization code на access token
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.email) {
      return popupResponse(false, "Необходима авторизация в Moonely");
    }

    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const configurationId = searchParams.get("configurationId");

    // Получаем сохранённый state из cookie
    const savedState = req.cookies.get("vercel_oauth_state")?.value;

    // Для Vercel Integrations проверяем state только если он есть в cookie
    // (куки могут не передаваться между доменами в некоторых браузерах)
    if (savedState && state !== savedState) {
      console.error("[Vercel OAuth] State mismatch:", { state, savedState });
      return popupResponse(false, "Ошибка безопасности. Попробуйте ещё раз.");
    }

    if (!code) {
      console.error("[Vercel OAuth] No code received. Params:", Object.fromEntries(searchParams.entries()));
      return popupResponse(false, "Авторизация была отменена");
    }
    
    console.log("[Vercel OAuth] Received code, configurationId:", configurationId);

    const clientId = process.env.VERCEL_CLIENT_ID;
    const clientSecret = process.env.VERCEL_CLIENT_SECRET;
    const redirectUri = process.env.VERCEL_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error("[Vercel OAuth] Missing credentials");
      return popupResponse(false, "Vercel OAuth не настроен");
    }

    // Обмениваем code на access token
    const tokenResponse = await fetch("https://api.vercel.com/v2/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("[Vercel OAuth] Token exchange failed:", error);
      return popupResponse(false, "Не удалось получить токен от Vercel");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("[Vercel OAuth] No access token in response:", tokenData);
      return popupResponse(false, "Vercel не вернул токен доступа");
    }

    // Проверяем токен, получая информацию о пользователе Vercel
    const userResponse = await fetch("https://api.vercel.com/v2/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    let vercelUsername: string | undefined;
    
    if (userResponse.ok) {
      const vercelUser = await userResponse.json();
      vercelUsername = vercelUser.user?.username;
      console.log("[Vercel OAuth] Successfully authorized Vercel user:", vercelUsername);
    }

    // Сохраняем токен в БД пользователя
    await prisma.user.update({
      where: { email: session.user.email },
      data: { 
        vercelToken: accessToken,
      },
    });

    // Возвращаем успешную страницу (popup закроется автоматически)
    const response = popupResponse(
      true, 
      "Теперь вы можете публиковать сайты",
      vercelUsername
    );
    
    // Очищаем state cookie
    response.cookies.delete("vercel_oauth_state");

    return response;

  } catch (error) {
    console.error("[Vercel OAuth] Callback error:", error);
    return popupResponse(false, "Произошла ошибка. Попробуйте ещё раз.");
  }
}
