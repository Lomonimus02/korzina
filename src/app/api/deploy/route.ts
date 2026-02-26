import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { createVercelDeployment, validateVercelToken, VercelEnvVar } from "@/lib/vercel";
import { ensureProjectKey } from "@/lib/db-utils";

/**
 * POST /api/deploy
 * Создаёт деплой сайта на Vercel
 * 
 * Body:
 * - files: Record<string, string> - файлы сайта
 * - projectName: string - название проекта
 * - chatId?: string - ID чата (опционально)
 * - vercelToken: string - токен Vercel пользователя
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
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        plan: true,
        vercelToken: true,
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }
    
    // TODO: Раскомментировать после тестирования для ограничения по тарифу
    // if (user.plan === "FREE") {
    //   return NextResponse.json(
    //     { error: "Публикация сайтов доступна только на платных тарифах" },
    //     { status: 403 }
    //   );
    // }
    
    const body = await req.json();
    const { files, projectName, chatId, vercelToken } = body;
    
    if (!files || typeof files !== "object") {
      return NextResponse.json(
        { error: "Файлы сайта не переданы" },
        { status: 400 }
      );
    }
    
    if (!projectName || typeof projectName !== "string") {
      return NextResponse.json(
        { error: "Название проекта не указано" },
        { status: 400 }
      );
    }
    
    // Используем переданный токен или сохранённый
    const token = vercelToken || user.vercelToken;
    
    if (!token) {
      return NextResponse.json(
        { error: "Токен Vercel не указан. Пожалуйста, добавьте токен в настройках." },
        { status: 400 }
      );
    }
    
    // Проверяем валидность токена
    const isValidToken = await validateVercelToken(token);
    if (!isValidToken) {
      return NextResponse.json(
        { error: "Недействительный токен Vercel. Проверьте правильность токена." },
        { status: 400 }
      );
    }
    
    // Сохраняем токен для будущих деплоев (если это новый токен)
    if (vercelToken && vercelToken !== user.vercelToken) {
      await prisma.user.update({
        where: { id: user.id },
        data: { vercelToken: vercelToken },
      });
    }
    
    // Генерируем уникальное имя проекта
    const sanitizedName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);
    const uniqueName = `${sanitizedName}-${Date.now().toString(36)}`;
    
    // Создаём запись о деплое в БД
    const deployment = await prisma.deployment.create({
      data: {
        userId: user.id,
        chatId: chatId || null,
        projectName: uniqueName,
        status: "DEPLOYING",
        files: JSON.stringify(files),
      },
    });
    
    try {
      // Подготавливаем переменные окружения для деплоя
      const envVars: VercelEnvVar[] = [];
      
      // Если есть chatId, создаём/получаем API ключ для Virtual Backend
      if (chatId) {
        const apiKey = await ensureProjectKey(chatId);
        
        // Добавляем API ключ как переменную окружения
        envVars.push({
          key: "NEXT_PUBLIC_MOONELY_API_KEY",
          value: apiKey,
          target: ["production", "preview", "development"],
          type: "encrypted",
        });
        
        // Добавляем URL бэкенда Moonely
        // PRODUCTION SETUP:
        // - Set MOONELY_PRODUCTION_API_URL to your stable production URL (e.g., https://moonely.app)
        // - This URL is passed to deployed sites so they can reach the Moonely API
        // - DO NOT use localhost or ngrok URLs in production!
        // 
        // Priority: MOONELY_PRODUCTION_API_URL > NEXT_PUBLIC_MOONELY_API_URL
        const rawApiUrl = process.env.MOONELY_PRODUCTION_API_URL || process.env.NEXT_PUBLIC_MOONELY_API_URL;
        
        if (!rawApiUrl) {
          console.error('[Deploy] ❌ CRITICAL: No Moonely API URL configured!');
          console.error('[Deploy] Set MOONELY_PRODUCTION_API_URL to your production URL (e.g., https://moonely.app)');
          console.error('[Deploy] Or set NEXT_PUBLIC_MOONELY_API_URL if using the same URL for local and production.');
          throw new Error('MOONELY_PRODUCTION_API_URL (or NEXT_PUBLIC_MOONELY_API_URL) environment variable is not set. Configure your production URL.');
        }
        
        // Validate the URL - must not be localhost in production
        if (rawApiUrl.includes('localhost') || rawApiUrl.includes('127.0.0.1')) {
          console.error('[Deploy] ❌ CRITICAL: API URL contains localhost!');
          console.error('[Deploy] This will NOT work for deployed sites.');
          console.error('[Deploy] Set MOONELY_PRODUCTION_API_URL to your production URL (e.g., https://moonely.app).');
          throw new Error('Moonely API URL cannot be localhost for deployments. Use your production URL.');
        }
        
        // Warn if still using ngrok (not recommended for production)
        if (rawApiUrl.includes('ngrok')) {
          console.warn('[Deploy] ⚠️ WARNING: Using ngrok URL for deployments.');
          console.warn('[Deploy] For production, set MOONELY_PRODUCTION_API_URL to a stable URL.');
        }
        
        // Sanitize the URL - ensure consistent format
        // Remove trailing slashes and /api/db suffix (SDK will add it)
        let moonelyApiUrl = rawApiUrl.trim();
        while (moonelyApiUrl.endsWith('/')) {
          moonelyApiUrl = moonelyApiUrl.slice(0, -1);
        }
        if (moonelyApiUrl.endsWith('/api/db')) {
          moonelyApiUrl = moonelyApiUrl.slice(0, -7);
        }
        
        console.log('[Deploy] ✅ Moonely API URL for deployment:', moonelyApiUrl);
        console.log('[Deploy] Final endpoint will be:', `${moonelyApiUrl}/api/db`);
        
        // Send just the base URL - SDK will append /api/db
        envVars.push({
          key: "NEXT_PUBLIC_MOONELY_API_URL",
          value: moonelyApiUrl,
          target: ["production", "preview", "development"],
          type: "plain",
        });
        
        // Добавляем Project ID
        envVars.push({
          key: "NEXT_PUBLIC_MOONELY_PROJECT_ID",
          value: chatId,
          target: ["production", "preview", "development"],
          type: "plain",
        });
      }
      
      // Создаём деплой на Vercel (передаём оригинальное название для title и env переменные)
      const result = await createVercelDeployment(
        token, 
        uniqueName, 
        files, 
        projectName,
        envVars.length > 0 ? envVars : undefined
      );
      
      // Обновляем запись с результатом
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          vercelProjectId: result.projectId,
          vercelDeploymentId: result.id,
          url: result.url,
          status: result.readyState === "READY" ? "DEPLOYED" : "DEPLOYING",
        },
      });
      
      return NextResponse.json({
        success: true,
        deploymentId: deployment.id,
        vercelDeploymentId: result.id,
        url: result.url,
        status: result.readyState,
      });
      
    } catch (deployError: any) {
      // Обновляем статус на FAILED
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: "FAILED" },
      });
      
      console.error("Deploy error:", deployError);
      
      return NextResponse.json(
        { error: deployError.message || "Ошибка при деплое" },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error("Deploy API error:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/deploy
 * Получает список деплоев пользователя
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
      select: { id: true },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }
    
    const deployments = await prisma.deployment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        projectName: true,
        url: true,
        customDomain: true,
        status: true,
        createdAt: true,
        chatId: true,
      },
    });
    
    return NextResponse.json({ deployments });
    
  } catch (error) {
    console.error("Get deployments error:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
