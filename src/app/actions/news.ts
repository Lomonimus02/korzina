"use server";

import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

const ADMIN_EMAIL = "bvvbvdvdc@gmail.com";

// Check if user is admin
async function checkAdmin() {
  const session = await getAuthSession();
  
  if (!session?.user?.email) {
    throw new Error("Unauthorized: You must be logged in");
  }
  
  // Check if user is the admin
  if (session.user.email !== ADMIN_EMAIL) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });
    
    if (!user || user.role !== "ADMIN") {
      throw new Error("Forbidden: Only admins can manage news");
    }
  }
  
  return true;
}

// Create a new news article
export async function createNews(data: {
  title: string;
  content: string;
  image?: string | null;
}) {
  await checkAdmin();
  
  if (!data.title || data.title.trim().length === 0) {
    throw new Error("Title is required");
  }
  
  if (!data.content || data.content.trim().length === 0) {
    throw new Error("Content is required");
  }
  
  const news = await prisma.news.create({
    data: {
      title: data.title.trim(),
      content: data.content.trim(),
      image: data.image?.trim() || null,
      published: true,
    },
  });
  
  revalidatePath("/");
  
  return { success: true, id: news.id };
}

// Update an existing news article
export async function updateNews(
  id: string,
  data: {
    title?: string;
    content?: string;
    image?: string | null;
    published?: boolean;
  }
) {
  await checkAdmin();
  
  const updateData: any = {};
  
  if (data.title !== undefined) {
    if (data.title.trim().length === 0) {
      throw new Error("Title cannot be empty");
    }
    updateData.title = data.title.trim();
  }
  
  if (data.content !== undefined) {
    if (data.content.trim().length === 0) {
      throw new Error("Content cannot be empty");
    }
    updateData.content = data.content.trim();
  }
  
  if (data.image !== undefined) {
    updateData.image = data.image?.trim() || null;
  }
  
  if (data.published !== undefined) {
    updateData.published = data.published;
  }
  
  const news = await prisma.news.update({
    where: { id },
    data: updateData,
  });
  
  revalidatePath("/");
  
  return { success: true, news };
}

// Delete a news article
export async function deleteNews(id: string) {
  await checkAdmin();
  
  await prisma.news.delete({
    where: { id },
  });
  
  revalidatePath("/");
  
  return { success: true };
}

// Get all news articles (for admin)
export async function getAllNews() {
  await checkAdmin();
  
  const news = await prisma.news.findMany({
    orderBy: { createdAt: "desc" },
  });
  
  return news;
}

// Get published news articles (for public)
export async function getPublishedNews(limit: number = 10) {
  const news = await prisma.news.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  
  return news;
}
