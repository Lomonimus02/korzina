import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/db";
import { cookies } from "next/headers";

// Валидация переменных окружения для Yandex Object Storage
function validateYandexCredentials() {
  const missing: string[] = [];
  if (!process.env.YC_ACCESS_KEY_ID) missing.push('YC_ACCESS_KEY_ID');
  if (!process.env.YC_SECRET_ACCESS_KEY) missing.push('YC_SECRET_ACCESS_KEY');
  if (!process.env.YC_BUCKET_NAME) missing.push('YC_BUCKET_NAME');
  
  if (missing.length > 0) {
    const errorMsg = `Missing Yandex Cloud environment variables: ${missing.join(', ')}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

// Инициализация S3 клиента для Yandex Object Storage
function createS3Client() {
  validateYandexCredentials();
  
  return new S3Client({
    region: "ru-central1",
    endpoint: "https://storage.yandexcloud.net",
    forcePathStyle: true, // Рекомендуется для Yandex Object Storage
    credentials: {
      accessKeyId: process.env.YC_ACCESS_KEY_ID!,
      secretAccessKey: process.env.YC_SECRET_ACCESS_KEY!,
    },
  });
}

const BUCKET_NAME = process.env.YC_BUCKET_NAME || '';

// Допустимые MIME типы для изображений
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];

// Максимальный размер файла: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Расширения для MIME типов
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export async function POST(request: NextRequest) {
  try {
    // 0. Проверка конфигурации Yandex Cloud
    const s3Client = createS3Client();
    
    // 1. Аутентификация пользователя (или trial-пользователя)
    let userId: string;
    let isTrialUser = false;
    
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      // Авторизованный пользователь
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });
      if (!user) {
        return NextResponse.json(
          { error: "Пользователь не найден" },
          { status: 401 }
        );
      }
      userId = user.id;
    } else {
      // Проверяем trial cookie
      const cookieStore = await cookies();
      const trialToken = cookieStore.get("moonely_trial_token")?.value;
      if (trialToken) {
        // Есть cookie — используем для идентификации
        userId = `trial_${trialToken.substring(0, 16)}`;
        isTrialUser = true;
      } else {
        // Нет cookie — проверяем Referer (загрузка с /try до первого промпта)
        const referer = request.headers.get("referer") || "";
        if (referer.includes("/try")) {
          userId = `trial_anonymous_${Date.now()}`;
          isTrialUser = true;
        } else {
          return NextResponse.json(
            { error: "Необходима авторизация" },
            { status: 401 }
          );
        }
      }
    }

    // 2. Парсинг formData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Файл не найден" },
        { status: 400 }
      );
    }

    // 3. Валидация типа файла
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Недопустимый тип файла. Разрешены: JPG, PNG, WebP, SVG" },
        { status: 400 }
      );
    }

    // 4. Валидация размера файла
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Файл слишком большой. Максимум: 5MB" },
        { status: 400 }
      );
    }

    // 5. Генерация уникального ключа
    const ext = MIME_TO_EXT[file.type] || "bin";
    const fileKey = `assets/${userId}/${uuidv4()}.${ext}`;

    // 6. Конвертация файла в Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 7. Загрузка в Yandex Object Storage
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: buffer,
      ContentType: file.type,
      // Делаем файл публично доступным
      ACL: "public-read",
    });

    await s3Client.send(putCommand);

    // 8. Формирование публичного URL
    const url = `https://${BUCKET_NAME}.storage.yandexcloud.net/${fileKey}`;

    // 9. Создание записи в базе данных (только для авторизованных пользователей)
    // Trial-пользователи не имеют записи User, поэтому Asset не создаётся
    if (!isTrialUser) {
      const asset = await prisma.asset.create({
        data: {
          userId,
          fileName: file.name,
          fileKey,
          url,
          size: file.size,
          mimeType: file.type,
        },
      });

      // 10. Возврат созданного Asset
      return NextResponse.json(asset);
    }

    // Для trial-пользователей возвращаем минимальный ответ
    return NextResponse.json({
      id: uuidv4(),
      url,
      fileName: file.name,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    // Детальное логирование ошибки для отладки в production
    console.error("Upload error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : "Unknown",
      stack: error instanceof Error ? error.stack : undefined,
      envCheck: {
        hasAccessKey: !!process.env.YC_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.YC_SECRET_ACCESS_KEY,
        hasBucket: !!process.env.YC_BUCKET_NAME,
      },
    });
    
    // Возвращаем более информативную ошибку
    const errorMessage = error instanceof Error ? error.message : "Ошибка загрузки файла";
    return NextResponse.json(
      { error: "Ошибка загрузки файла", details: errorMessage },
      { status: 500 }
    );
  }
}
