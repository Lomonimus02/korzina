"use server";

import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";

// ── helpers ──────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await getAuthSession();
  if (!session?.user?.email) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Forbidden");
}

// ── 1. Individual Prompts (paginated) ────────────────────────────────────────
// Shows every message (user + assistant) with token/cost data.
// Token/cost data is non-zero only for assistant messages.

export interface PromptRow {
  id: string;
  role: string;
  content: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  createdAt: string;
  chatId: string;
  chatTitle: string;
  userEmail: string;
}

export async function getIndividualPrompts(page = 1, pageSize = 30) {
  await requireAdmin();

  const [rows, total] = await Promise.all([
    prisma.message.findMany({
      where: { role: "assistant" },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        role: true,
        content: true,
        promptTokens: true,
        completionTokens: true,
        cost: true,
        createdAt: true,
        chatId: true,
        chat: {
          select: {
            title: true,
            user: { select: { email: true } },
          },
        },
      },
    }),
    prisma.message.count({ where: { role: "assistant" } }),
  ]);

  const data: PromptRow[] = rows.map((r: any) => ({
    id: r.id,
    role: r.role,
    content: r.content.slice(0, 200),
    promptTokens: r.promptTokens ?? 0,
    completionTokens: r.completionTokens ?? 0,
    cost: r.cost ?? 0,
    createdAt: r.createdAt.toISOString(),
    chatId: r.chatId,
    chatTitle: r.chat.title,
    userEmail: r.chat.user.email,
  }));

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// ── 2. Chat Averages ─────────────────────────────────────────────────────────
// Average cost & tokens per prompt *within each chat*.
// Only counts assistant messages (where token/cost data lives).

export interface ChatAvgRow {
  chatId: string;
  chatTitle: string;
  userEmail: string;
  avgPromptTokens: number;
  avgCompletionTokens: number;
  avgCost: number;
  messageCount: number; // assistant messages only
}

export async function getChatAverages(page = 1, pageSize = 100) {
  await requireAdmin();

  const [chats, totalChats] = await Promise.all([
    prisma.chat.findMany({
      select: {
        id: true,
        title: true,
        user: { select: { email: true } },
        messages: {
          where: { role: "assistant" },
          select: {
            promptTokens: true,
            completionTokens: true,
            cost: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.chat.count(),
  ]);

  const data = chats.map((c: any) => {
    const msgs: any[] = c.messages;
    const n = msgs.length || 1;
    return {
      chatId: c.id,
      chatTitle: c.title,
      userEmail: c.user.email,
      avgPromptTokens: Math.round(
        msgs.reduce((s: number, m: any) => s + (m.promptTokens ?? 0), 0) / n
      ),
      avgCompletionTokens: Math.round(
        msgs.reduce((s: number, m: any) => s + (m.completionTokens ?? 0), 0) / n
      ),
      avgCost: msgs.reduce((s: number, m: any) => s + (m.cost ?? 0), 0) / n,
      messageCount: msgs.length,
    } satisfies ChatAvgRow;
  });

  return { data, total: totalChats, page, pageSize, totalPages: Math.ceil(totalChats / pageSize) };
}

// ── 3. User Chat Totals ──────────────────────────────────────────────────────
// Total cost & tokens for each chat (sum of all assistant messages).

export interface UserChatTotalRow {
  userEmail: string;
  chatId: string;
  chatTitle: string;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCost: number;
  messageCount: number; // total messages (user + assistant)
}

export async function getUserChatTotals(page = 1, pageSize = 100) {
  await requireAdmin();

  const [chats, totalChats] = await Promise.all([
    prisma.chat.findMany({
      select: {
        id: true,
        title: true,
        user: { select: { email: true } },
        messages: {
          select: {
            role: true,
            promptTokens: true,
            completionTokens: true,
            cost: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.chat.count(),
  ]);

  const data = chats.map((c: any) => ({
    userEmail: c.user.email,
    chatId: c.id,
    chatTitle: c.title,
    totalPromptTokens: c.messages.reduce((s: number, m: any) => s + (m.promptTokens ?? 0), 0),
    totalCompletionTokens: c.messages.reduce(
      (s: number, m: any) => s + (m.completionTokens ?? 0),
      0
    ),
    totalCost: c.messages.reduce((s: number, m: any) => s + (m.cost ?? 0), 0),
    messageCount: c.messages.length,
  })) satisfies UserChatTotalRow[];

  return { data, total: totalChats, page, pageSize, totalPages: Math.ceil(totalChats / pageSize) };
}

// ── 4. Prompts per Chat ──────────────────────────────────────────────────────
// Number of user-sent prompts in each chat.

export interface PromptsPerChatRow {
  chatId: string;
  chatTitle: string;
  userEmail: string;
  promptCount: number;
}

export async function getPromptsPerChat(page = 1, pageSize = 100) {
  await requireAdmin();

  const [chats, totalChats] = await Promise.all([
    prisma.chat.findMany({
      select: {
        id: true,
        title: true,
        user: { select: { email: true } },
        messages: {
          where: { role: "user" },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.chat.count(),
  ]);

  const data = chats.map((c: any) => ({
    chatId: c.id,
    chatTitle: c.title,
    userEmail: c.user.email,
    promptCount: c.messages.length,
  })) satisfies PromptsPerChatRow[];

  return { data, total: totalChats, page, pageSize, totalPages: Math.ceil(totalChats / pageSize) };
}

// ── 5. First Prompt Stats ────────────────────────────────────────────────────
// Cost & tokens of the first assistant response in each chat.
// This represents the cost of the user's first prompt interaction.

export interface FirstPromptRow {
  chatId: string;
  chatTitle: string;
  userEmail: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  createdAt: string;
}

export async function getFirstPromptStats() {
  await requireAdmin();

  // Get the first ASSISTANT message per chat (has actual token/cost data)
  const rows = await prisma.$queryRaw<
    {
      chatId: string;
      chatTitle: string;
      userEmail: string;
      promptTokens: number;
      completionTokens: number;
      cost: number;
      createdAt: Date;
    }[]
  >`
    SELECT DISTINCT ON (m."chatId")
      m."chatId",
      c."title"       AS "chatTitle",
      u."email"       AS "userEmail",
      COALESCE(m."promptTokens", 0)     AS "promptTokens",
      COALESCE(m."completionTokens", 0) AS "completionTokens",
      COALESCE(m."cost", 0)             AS "cost",
      m."createdAt"
    FROM "Message" m
    JOIN "Chat" c ON c."id" = m."chatId"
    JOIN "User" u ON u."id" = c."userId"
    WHERE m."role" = 'assistant'
    ORDER BY m."chatId", m."createdAt" ASC
  `;

  return rows.map((r: any) => ({
    ...r,
    promptTokens: Number(r.promptTokens),
    completionTokens: Number(r.completionTokens),
    cost: Number(r.cost),
    createdAt: r.createdAt.toISOString(),
  })) satisfies FirstPromptRow[];
}

// ── 6–9. Key Aggregates ─────────────────────────────────────────────────────

export interface KeyMetrics {
  avgFirstPromptCost: number;
  avgFirstPromptTokens: number; // promptTokens + completionTokens
  avgChatCost: number;
  avgChatTokens: number;
  avgPromptCost: number;
  avgPromptTokens: number;
  avgPromptsPerChat: number;
  totalMessages: number;
  totalChats: number;
  totalCost: number;
}

export async function getKeyMetrics(): Promise<KeyMetrics> {
  await requireAdmin();

  const [assistantAgg, userMsgCount, chatCount, firstPromptAgg] = await Promise.all([
    // Aggregate ONLY assistant messages (which carry real token/cost data)
    prisma.message.aggregate({
      where: { role: "assistant" },
      _count: { id: true },
      _sum: { cost: true, promptTokens: true, completionTokens: true },
      _avg: { cost: true, promptTokens: true, completionTokens: true },
    }),
    // Count user messages (= number of prompts sent)
    prisma.message.count({ where: { role: "user" } }),
    prisma.chat.count(),
    // Average of first ASSISTANT message costs per chat
    prisma.$queryRaw<{ avgCost: number; avgPromptTokens: number; avgCompletionTokens: number }[]>`
      SELECT
        AVG(sub."cost")::float               AS "avgCost",
        AVG(sub."promptTokens")::float       AS "avgPromptTokens",
        AVG(sub."completionTokens")::float   AS "avgCompletionTokens"
      FROM (
        SELECT DISTINCT ON ("chatId")
          COALESCE("cost", 0)             AS "cost",
          COALESCE("promptTokens", 0)     AS "promptTokens",
          COALESCE("completionTokens", 0) AS "completionTokens"
        FROM "Message"
        WHERE "role" = 'assistant'
        ORDER BY "chatId", "createdAt" ASC
      ) sub
    `,
  ]);

  const totalAssistantMsgs = assistantAgg._count.id;
  const totalCost = assistantAgg._sum.cost ?? 0;
  const totalPromptTokens = assistantAgg._sum.promptTokens ?? 0;
  const totalCompletionTokens = assistantAgg._sum.completionTokens ?? 0;
  const totalChats = chatCount || 1;

  const fpAvgCost = firstPromptAgg[0]?.avgCost ?? 0;
  const fpAvgPromptTokens = firstPromptAgg[0]?.avgPromptTokens ?? 0;
  const fpAvgCompletionTokens = firstPromptAgg[0]?.avgCompletionTokens ?? 0;

  return {
    avgFirstPromptCost: fpAvgCost,
    avgFirstPromptTokens: fpAvgPromptTokens + fpAvgCompletionTokens,
    avgChatCost: totalCost / totalChats,
    avgChatTokens: (totalPromptTokens + totalCompletionTokens) / totalChats,
    avgPromptCost: assistantAgg._avg.cost ?? 0,
    avgPromptTokens: (assistantAgg._avg.promptTokens ?? 0) + (assistantAgg._avg.completionTokens ?? 0),
    avgPromptsPerChat: userMsgCount / totalChats,
    totalMessages: totalAssistantMsgs + userMsgCount,
    totalChats: chatCount,
    totalCost,
  };
}

// ── 10. Button Clicks ────────────────────────────────────────────────────────

export interface ButtonClickRow {
  buttonId: string;
  count: number;
}

export async function getButtonClicks() {
  await requireAdmin();

  const rows = await prisma.$queryRaw<{ buttonId: string; count: bigint }[]>`
    SELECT
      meta->>'buttonId' AS "buttonId",
      COUNT(*)          AS "count"
    FROM "AnalyticsEvent"
    WHERE type = 'BUTTON_CLICK'
      AND meta->>'buttonId' IS NOT NULL
    GROUP BY meta->>'buttonId'
    ORDER BY "count" DESC
  `;

  return rows.map((r: any) => ({
    buttonId: r.buttonId,
    count: Number(r.count),
  })) satisfies ButtonClickRow[];
}

// ── 11. Avg Time on Page ─────────────────────────────────────────────────────

export interface PageTimeRow {
  page: string;
  avgDuration: number; // ms
  views: number;
}

export async function getAvgTimeOnPage() {
  await requireAdmin();

  const rows = await prisma.$queryRaw<
    { page: string; avgDuration: number; views: bigint }[]
  >`
    SELECT
      page,
      AVG((meta->>'duration')::float) AS "avgDuration",
      COUNT(*)                        AS "views"
    FROM "AnalyticsEvent"
    WHERE type = 'PAGE_VIEW'
      AND meta->>'duration' IS NOT NULL
    GROUP BY page
    ORDER BY "views" DESC
  `;

  return rows.map((r: any) => ({
    page: r.page,
    avgDuration: Math.round(r.avgDuration),
    views: Number(r.views),
  })) satisfies PageTimeRow[];
}

// ── Cost over time (for line chart) ──────────────────────────────────────────

export interface CostOverTimeRow {
  date: string;
  totalCost: number;
  messageCount: number;
}

export async function getCostOverTime() {
  await requireAdmin();

  const rows = await prisma.$queryRaw<
    { date: Date; totalCost: number; messageCount: bigint }[]
  >`
    SELECT
      DATE("createdAt")           AS "date",
      SUM(COALESCE("cost", 0))    AS "totalCost",
      COUNT(*)                    AS "messageCount"
    FROM "Message"
    WHERE "role" = 'assistant'
    GROUP BY DATE("createdAt")
    ORDER BY "date" ASC
  `;

  return rows.map((r: any) => ({
    date: r.date.toISOString().slice(0, 10),
    totalCost: Number(r.totalCost),
    messageCount: Number(r.messageCount),
  })) satisfies CostOverTimeRow[];
}
