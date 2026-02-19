/**
 * Утилиты для работы с базой данных Virtual Backend
 */

import prisma from "@/lib/db";
import crypto from "crypto";

/**
 * Генерирует API ключ в формате mk_...
 */
export function generateApiKey(): string {
  return `mk_${crypto.randomBytes(24).toString("hex")}`;
}

/**
 * Гарантирует наличие API ключа для проекта.
 * Если ключ существует — возвращает его.
 * Если нет — создаёт новый и возвращает.
 * 
 * @param projectId - ID проекта (chatId)
 * @returns API ключ для проекта
 */
export async function ensureProjectKey(projectId: string): Promise<string> {
  // Ищем существующий ключ
  const existingKey = await prisma.projectApiKey.findUnique({
    where: { projectId },
  });

  if (existingKey) {
    return existingKey.key;
  }

  // Создаём новый ключ
  const newKey = generateApiKey();
  
  const apiKey = await prisma.projectApiKey.create({
    data: {
      projectId,
      key: newKey,
    },
  });

  return apiKey.key;
}

/**
 * Получает API ключ проекта (если существует)
 * 
 * @param projectId - ID проекта (chatId)
 * @returns API ключ или null
 */
export async function getProjectKey(projectId: string): Promise<string | null> {
  const apiKey = await prisma.projectApiKey.findUnique({
    where: { projectId },
  });

  return apiKey?.key || null;
}

/**
 * Удаляет API ключ проекта
 * 
 * @param projectId - ID проекта (chatId)
 */
export async function deleteProjectKey(projectId: string): Promise<void> {
  await prisma.projectApiKey.deleteMany({
    where: { projectId },
  });
}

/**
 * Пересоздаёт API ключ проекта (ротация)
 * 
 * @param projectId - ID проекта (chatId)
 * @returns Новый API ключ
 */
export async function rotateProjectKey(projectId: string): Promise<string> {
  // Удаляем старый ключ
  await deleteProjectKey(projectId);
  
  // Создаём новый
  return ensureProjectKey(projectId);
}
