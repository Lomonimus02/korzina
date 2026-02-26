import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { getDeploymentStatus, deleteDeployment } from "@/lib/vercel";

/**
 * GET /api/deploy/[id]
 * Получает информацию о конкретном деплое
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    const { id } = await params;
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, vercelToken: true },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }
    
    const deployment = await prisma.deployment.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
    });
    
    if (!deployment) {
      return NextResponse.json(
        { error: "Деплой не найден" },
        { status: 404 }
      );
    }
    
    // Если деплой в процессе и есть токен — проверяем статус в Vercel
    if (deployment.status === "DEPLOYING" && deployment.vercelDeploymentId && user.vercelToken) {
      try {
        const vercelStatus = await getDeploymentStatus(
          user.vercelToken,
          deployment.vercelDeploymentId
        );
        
        // Обновляем статус в БД если изменился
        if (vercelStatus.readyState === "READY") {
          await prisma.deployment.update({
            where: { id: deployment.id },
            data: { 
              status: "DEPLOYED",
              url: vercelStatus.url,
            },
          });
          deployment.status = "DEPLOYED";
          deployment.url = vercelStatus.url;
        } else if (vercelStatus.readyState === "ERROR") {
          await prisma.deployment.update({
            where: { id: deployment.id },
            data: { status: "FAILED" },
          });
          deployment.status = "FAILED";
        }
      } catch (e) {
        console.error("Error checking Vercel status:", e);
      }
    }
    
    return NextResponse.json({
      id: deployment.id,
      projectName: deployment.projectName,
      url: deployment.url,
      customDomain: deployment.customDomain,
      status: deployment.status,
      createdAt: deployment.createdAt,
      chatId: deployment.chatId,
    });
    
  } catch (error) {
    console.error("Get deployment error:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/deploy/[id]
 * Удаляет деплой
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    const { id } = await params;
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, vercelToken: true },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }
    
    const deployment = await prisma.deployment.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
    });
    
    if (!deployment) {
      return NextResponse.json(
        { error: "Деплой не найден" },
        { status: 404 }
      );
    }
    
    // Пытаемся удалить из Vercel (если есть токен и ID деплоя)
    if (user.vercelToken && deployment.vercelDeploymentId) {
      try {
        await deleteDeployment(user.vercelToken, deployment.vercelDeploymentId);
      } catch (e) {
        console.error("Error deleting from Vercel:", e);
        // Продолжаем удаление из БД даже если Vercel вернул ошибку
      }
    }
    
    // Удаляем из БД
    await prisma.deployment.delete({
      where: { id: deployment.id },
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Delete deployment error:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
