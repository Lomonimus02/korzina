import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { deployFiles, getSandboxUrl } from "@/lib/deploy/coolify";
import { bundleToStaticFiles } from "@/lib/deploy/bundler";
import { ensureProjectKey } from "@/lib/db-utils";

/**
 * POST /api/deploy
 * Публикует сайт в Moonely Sandbox через Coolify.
 *
 * Body:
 * - files: Record<string, string>  – файлы сайта (сгенерированные в чате)
 * - chatId: string                 – ID чата (используется как subdomain)
 *
 * Response:
 * - { url, status: "prepared" | "deployed", deploymentId }
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
      select: { id: true, plan: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { files, chatId } = body;

    if (!files || typeof files !== "object") {
      return NextResponse.json(
        { error: "Файлы сайта не переданы" },
        { status: 400 }
      );
    }

    if (!chatId || typeof chatId !== "string") {
      return NextResponse.json(
        { error: "chatId обязателен" },
        { status: 400 }
      );
    }

    // Use chatId slug as project name (sanitised for DNS)
    const sanitizedSlug = chatId
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);

    // Ensure there's a virtual backend API key for this chat project
    const apiKey = await ensureProjectKey(chatId).catch(() => null);
    console.log(`[Deploy] API key for chatId=${chatId}:`, apiKey ? "ok" : "skipped");

    // 1 Chat = 1 Deployment: upsert so the dashboard only shows the latest deploy
    const existing = await prisma.deployment.findFirst({
      where: { chatId, userId: user.id },
      select: { id: true },
    });

    const deployment = existing
      ? await prisma.deployment.update({
          where: { id: existing.id },
          data: {
            projectName: sanitizedSlug,
            status: "DEPLOYING",
            files: JSON.stringify(files),
          },
        })
      : await prisma.deployment.create({
          data: {
            userId: user.id,
            chatId,
            projectName: sanitizedSlug,
            status: "DEPLOYING",
            files: JSON.stringify(files),
          },
        });

    try {
      // Bundle TSX → static HTML (compile React source files)
      const bundledFiles = await bundleToStaticFiles(files);

      // Deploy static files via agent
      const result = await deployFiles(chatId, bundledFiles);

      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          url: result.url,
          status: "DEPLOYED",
        },
      });

      return NextResponse.json({
        success: true,
        deploymentId: deployment.id,
        url: result.url,
        status: result.status,
      });
    } catch (deployError: any) {
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: "FAILED" },
      });

      console.error("[Deploy] Error:", deployError);
      return NextResponse.json(
        { error: deployError.message || "Ошибка при деплое" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[Deploy] API error:", error);
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
