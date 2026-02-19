import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";
import crypto from "crypto";

// ============================================
// CORS Headers для внешних запросов
// ============================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Bypass-Tunnel-Reminder, ngrok-skip-browser-warning",
};

// ============================================
// Helper: Авторизация доступа к проекту
// ============================================
type AuthResult = {
  projectId: string;
  userId?: string;
  authMethod: "session" | "apiKey";
};

async function authorizeProjectAccess(
  req: NextRequest,
  requestedProjectId?: string
): Promise<AuthResult> {
  // Способ А: Проверка API ключа из заголовка Authorization
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer mk_")) {
    const apiKey = authHeader.replace("Bearer ", "");
    
    const keyRecord = await prisma.projectApiKey.findUnique({
      where: { key: apiKey },
    });

    if (!keyRecord) {
      throw new Error("INVALID_API_KEY");
    }

    // Если передан projectId в запросе, он должен совпадать с ключом
    if (requestedProjectId && requestedProjectId !== keyRecord.projectId) {
      throw new Error("PROJECT_MISMATCH");
    }

    return {
      projectId: keyRecord.projectId,
      authMethod: "apiKey",
    };
  }

  // Способ Б: Проверка сессии пользователя
  const session = await getAuthSession();
  
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }

  const userId = (session.user as any).id;

  if (!requestedProjectId) {
    throw new Error("PROJECT_ID_REQUIRED");
  }

  // Проверяем, что пользователь владеет этим проектом (чатом)
  const chat = await prisma.chat.findFirst({
    where: {
      id: requestedProjectId,
      userId: userId,
    },
  });

  if (!chat) {
    throw new Error("ACCESS_DENIED");
  }

  return {
    projectId: requestedProjectId,
    userId: userId,
    authMethod: "session",
  };
}

// ============================================
// OPTIONS - CORS preflight
// ============================================
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// ============================================
// GET - Получить записи из коллекции
// Query params: projectId, collection, id (опционально)
// ============================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const collection = searchParams.get("collection");
    const recordId = searchParams.get("id");

    // Авторизация
    const auth = await authorizeProjectAccess(req, projectId || undefined);

    // Если запрашивается конкретная запись
    if (recordId) {
      const record = await prisma.virtualRecord.findFirst({
        where: {
          id: recordId,
          chatId: auth.projectId,
        },
      });

      if (!record) {
        return NextResponse.json(
          { error: "Record not found" },
          { status: 404, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        { success: true, data: record },
        { headers: corsHeaders }
      );
    }

    // Получаем все записи коллекции
    if (!collection) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const records = await prisma.virtualRecord.findMany({
      where: {
        chatId: auth.projectId,
        collection: collection,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { success: true, data: records },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return handleAuthError(error);
  }
}

// ============================================
// POST - Создать новую запись
// Body: { projectId, collection, data }
// ============================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, collection, data } = body;

    if (!collection) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (data === undefined) {
      return NextResponse.json(
        { error: "Data is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Авторизация
    const auth = await authorizeProjectAccess(req, projectId);

    // Создаём запись
    const record = await prisma.virtualRecord.create({
      data: {
        chatId: auth.projectId,
        collection: collection,
        data: data,
      },
    });

    return NextResponse.json(
      { success: true, data: record },
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    return handleAuthError(error);
  }
}

// ============================================
// PUT - Обновить существующую запись
// Body: { projectId, id, data }
// ============================================
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, id, data } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Record ID is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (data === undefined) {
      return NextResponse.json(
        { error: "Data is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Авторизация
    const auth = await authorizeProjectAccess(req, projectId);

    // Проверяем, что запись принадлежит этому проекту
    const existingRecord = await prisma.virtualRecord.findFirst({
      where: {
        id: id,
        chatId: auth.projectId,
      },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: "Record not found or access denied" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Обновляем запись
    const record = await prisma.virtualRecord.update({
      where: { id: id },
      data: {
        data: data,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      { success: true, data: record },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    return handleAuthError(error);
  }
}

// ============================================
// DELETE - Удалить запись
// Query params: projectId, id
// ============================================
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const recordId = searchParams.get("id");

    if (!recordId) {
      return NextResponse.json(
        { error: "Record ID is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Авторизация
    const auth = await authorizeProjectAccess(req, projectId || undefined);

    // Проверяем, что запись принадлежит этому проекту
    const existingRecord = await prisma.virtualRecord.findFirst({
      where: {
        id: recordId,
        chatId: auth.projectId,
      },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: "Record not found or access denied" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Удаляем запись
    await prisma.virtualRecord.delete({
      where: { id: recordId },
    });

    return NextResponse.json(
      { success: true, message: "Record deleted" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    return handleAuthError(error);
  }
}

// ============================================
// Helper: Обработка ошибок авторизации
// ============================================
function handleAuthError(error: any) {
  const message = error?.message || "Unknown error";

  switch (message) {
    case "INVALID_API_KEY":
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401, headers: corsHeaders }
      );
    case "PROJECT_MISMATCH":
      return NextResponse.json(
        { error: "API key does not match the requested project" },
        { status: 403, headers: corsHeaders }
      );
    case "UNAUTHORIZED":
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401, headers: corsHeaders }
      );
    case "PROJECT_ID_REQUIRED":
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400, headers: corsHeaders }
      );
    case "ACCESS_DENIED":
      return NextResponse.json(
        { error: "You do not have access to this project" },
        { status: 403, headers: corsHeaders }
      );
    default:
      console.error("Virtual Backend error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: corsHeaders }
      );
  }
}

// ============================================
// Utility: Генерация API ключа для проекта
// ============================================
export function generateApiKey(): string {
  return `mk_${crypto.randomBytes(24).toString("hex")}`;
}
