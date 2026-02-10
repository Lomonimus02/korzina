"use server";

import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function publishToShowcase(
  chatId: string,
  title: string,
  description: string,
  files: Record<string, string>,
  thumbnail: string
) {
  const session = await getAuthSession();
  
  if (!session?.user?.email) {
    throw new Error("Unauthorized: You must be logged in");
  }
  
  // Always check role from database (not from session token which may be stale)
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  
  if (!user) {
    throw new Error("User not found");
  }
  
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden: Only admins can publish to showcase");
  }
  
  // Validate required fields
  if (!title || title.trim().length === 0) {
    throw new Error("Title is required");
  }
  
  if (!files || Object.keys(files).length === 0) {
    throw new Error("Files are required");
  }
  
  // Get the maximum order value to add new item at the end
  const maxOrderItem = await prisma.showcaseItem.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const newOrder = (maxOrderItem?.order ?? -1) + 1;
  
  // Create the showcase item
  const showcaseItem = await prisma.showcaseItem.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      thumbnail: thumbnail?.trim() || null,
      filesSnapshot: files,
      chatId: chatId || null,
      order: newOrder,
    },
  });
  
  // Revalidate the landing page to show the new item
  revalidatePath("/");
  
  return { success: true, id: showcaseItem.id };
}

export async function deleteShowcaseItem(id: string) {
  const session = await getAuthSession();
  
  if (!session?.user?.email) {
    throw new Error("Unauthorized: You must be logged in");
  }
  
  // Always check role from database
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });
  
  if (!user || user.role !== "ADMIN") {
    throw new Error("Forbidden: Only admins can delete showcase items");
  }
  
  await prisma.showcaseItem.delete({
    where: { id },
  });
  
  revalidatePath("/");
  
  return { success: true };
}

export async function getShowcaseItems(limit: number = 20) {
  const items = await prisma.showcaseItem.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    take: limit,
  });
  
  return items;
}
