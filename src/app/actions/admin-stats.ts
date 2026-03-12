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

export async function getIndividualPrompts(page = 1, pageSize = 30, searchEmail = "") {
  await requireAdmin();

  const whereClause: any = { role: "assistant" };
  if (searchEmail.trim()) {
    // Search by email OR by "trial" keyword for anonymous chats
    const term = searchEmail.trim().toLowerCase();
    if (term === "trial" || term === "анон") {
      whereClause.chat = { userId: null };
    } else {
      whereClause.chat = {
        user: {
          email: { contains: searchEmail.trim(), mode: "insensitive" },
        },
      };
    }
  }

  const [rows, total] = await Promise.all([
    prisma.message.findMany({
      where: whereClause,
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
            trialToken: true,
            user: { select: { email: true } },
          },
        },
      },
    }),
    prisma.message.count({ where: whereClause }),
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
    userEmail: r.chat.user?.email ?? "🔗 Trial (анон)",
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

export async function getChatAverages(page = 1, pageSize = 100, searchEmail = "") {
  await requireAdmin();

  const whereClause: any = {};
  if (searchEmail.trim()) {
    const term = searchEmail.trim().toLowerCase();
    if (term === "trial" || term === "анон") {
      whereClause.userId = null;
    } else {
      whereClause.user = {
        email: { contains: searchEmail.trim(), mode: "insensitive" },
      };
    }
  }

  const [chats, totalChats] = await Promise.all([
    prisma.chat.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        trialToken: true,
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
    prisma.chat.count({ where: whereClause }),
  ]);

  const data = chats.map((c: any) => {
    const msgs: any[] = c.messages;
    const n = msgs.length || 1;
    return {
      chatId: c.id,
      chatTitle: c.title,
      userEmail: c.user?.email ?? "🔗 Trial (анон)",
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

export async function getUserChatTotals(page = 1, pageSize = 100, searchEmail = "") {
  await requireAdmin();

  const whereClause: any = {};
  if (searchEmail.trim()) {
    const term = searchEmail.trim().toLowerCase();
    if (term === "trial" || term === "анон") {
      whereClause.userId = null;
    } else {
      whereClause.user = {
        email: { contains: searchEmail.trim(), mode: "insensitive" },
      };
    }
  }

  const [chats, totalChats] = await Promise.all([
    prisma.chat.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        trialToken: true,
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
    prisma.chat.count({ where: whereClause }),
  ]);

  const data = chats.map((c: any) => ({
    userEmail: c.user?.email ?? "🔗 Trial (анон)",
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

export async function getPromptsPerChat(page = 1, pageSize = 100, searchEmail = "") {
  await requireAdmin();

  const whereClause: any = {};
  if (searchEmail.trim()) {
    const term = searchEmail.trim().toLowerCase();
    if (term === "trial" || term === "анон") {
      whereClause.userId = null;
    } else {
      whereClause.user = {
        email: { contains: searchEmail.trim(), mode: "insensitive" },
      };
    }
  }

  const [chats, totalChats] = await Promise.all([
    prisma.chat.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        trialToken: true,
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
    prisma.chat.count({ where: whereClause }),
  ]);

  const data = chats.map((c: any) => ({
    chatId: c.id,
    chatTitle: c.title,
    userEmail: c.user?.email ?? "🔗 Trial (анон)",
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
    LEFT JOIN "User" u ON u."id" = c."userId"
    WHERE m."role" = 'assistant'
    ORDER BY m."chatId", m."createdAt" ASC
  `;

  return rows.map((r: any) => ({
    ...r,
    userEmail: r.userEmail ?? "🔗 Trial (анон)",
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

  // Exclude individual project pages (/c/[chatId]) — only count public pages
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
      AND page NOT LIKE '/c/%'
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

// ── 12. All Users (paginated, searchable, filterable) ────────────────────────

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  role: string;
  credits: number;
  lifetimeCredits: number;
  dailyGenerations: number;
  monthlyGenerations: number;
  isVerified: boolean;
  createdAt: string;
  subscriptionEndAt: string | null;
  totalChats: number;
  totalCost: number;
}

export type UserPlanFilter = "ALL" | "FREE" | "PAID" | "STARTER" | "CREATOR" | "PRO" | "STUDIO" | "AGENCY";

export async function getAllUsers(
  page = 1,
  pageSize = 20,
  searchEmail = "",
  planFilter: UserPlanFilter = "ALL"
) {
  await requireAdmin();

  const whereClause: any = {};

  if (searchEmail.trim()) {
    whereClause.email = { contains: searchEmail.trim(), mode: "insensitive" };
  }

  if (planFilter === "PAID") {
    whereClause.plan = { not: "FREE" };
  } else if (planFilter === "FREE") {
    whereClause.plan = "FREE";
  } else if (planFilter !== "ALL") {
    whereClause.plan = planFilter;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        role: true,
        credits: true,
        lifetimeCredits: true,
        dailyGenerations: true,
        monthlyGenerations: true,
        isVerified: true,
        createdAt: true,
        subscriptionEndAt: true,
        _count: {
          select: { chats: true },
        },
        chats: {
          select: {
            messages: {
              where: { role: "assistant" },
              select: { cost: true },
            },
          },
        },
      },
    }),
    prisma.user.count({ where: whereClause }),
  ]);

  const data: AdminUserRow[] = users.map((u: any) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    plan: u.plan,
    role: u.role,
    credits: u.credits,
    lifetimeCredits: u.lifetimeCredits,
    dailyGenerations: u.dailyGenerations,
    monthlyGenerations: u.monthlyGenerations,
    isVerified: u.isVerified,
    createdAt: u.createdAt.toISOString(),
    subscriptionEndAt: u.subscriptionEndAt?.toISOString() ?? null,
    totalChats: u._count.chats,
    totalCost: u.chats.reduce(
      (sum: number, chat: any) =>
        sum + chat.messages.reduce((s: number, m: any) => s + (m.cost ?? 0), 0),
      0
    ),
  }));

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// ── 13. Single User Detail ───────────────────────────────────────────────────

export interface AdminUserDetail {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  plan: string;
  role: string;
  credits: number;
  lifetimeCredits: number;
  dailyGenerations: number;
  monthlyGenerations: number;
  isVerified: boolean;
  createdAt: string;
  subscriptionStartAt: string | null;
  subscriptionEndAt: string | null;
  dailyResetAt: string;
  monthlyResetAt: string;
  totalChats: number;
  totalMessages: number;
  totalCost: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  chats: {
    id: string;
    title: string;
    createdAt: string;
    messageCount: number;
    totalCost: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
  }[];
  payments: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    plan: string | null;
    purchaseType: string;
    createdAt: string;
  }[];
  deployments: {
    id: string;
    projectName: string;
    url: string | null;
    status: string;
    createdAt: string;
  }[];
}

export async function getUserDetail(userId: string): Promise<AdminUserDetail | null> {
  await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      plan: true,
      role: true,
      credits: true,
      lifetimeCredits: true,
      dailyGenerations: true,
      monthlyGenerations: true,
      isVerified: true,
      createdAt: true,
      subscriptionStartAt: true,
      subscriptionEndAt: true,
      dailyResetAt: true,
      monthlyResetAt: true,
      chats: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          createdAt: true,
          messages: {
            select: {
              role: true,
              promptTokens: true,
              completionTokens: true,
              cost: true,
            },
          },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          plan: true,
          purchaseType: true,
          createdAt: true,
        },
      },
      deployments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          projectName: true,
          url: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) return null;

  let totalMessages = 0;
  let totalCost = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  const chats = user.chats.map((c: any) => {
    // Only count assistant messages to avoid double-counting (user + assistant = 2 per generation)
    const assistantMsgs = c.messages.filter((m: any) => m.role === "assistant");
    const chatCost = assistantMsgs.reduce((s: number, m: any) => s + (m.cost ?? 0), 0);
    const chatPT = assistantMsgs.reduce((s: number, m: any) => s + (m.promptTokens ?? 0), 0);
    const chatCT = assistantMsgs.reduce((s: number, m: any) => s + (m.completionTokens ?? 0), 0);
    totalMessages += assistantMsgs.length;
    totalCost += chatCost;
    totalPromptTokens += chatPT;
    totalCompletionTokens += chatCT;
    return {
      id: c.id,
      title: c.title,
      createdAt: c.createdAt.toISOString(),
      messageCount: assistantMsgs.length,
      totalCost: chatCost,
      totalPromptTokens: chatPT,
      totalCompletionTokens: chatCT,
    };
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    plan: user.plan,
    role: user.role,
    credits: user.credits,
    lifetimeCredits: user.lifetimeCredits,
    dailyGenerations: user.dailyGenerations,
    monthlyGenerations: user.monthlyGenerations,
    isVerified: user.isVerified,
    createdAt: user.createdAt.toISOString(),
    subscriptionStartAt: user.subscriptionStartAt?.toISOString() ?? null,
    subscriptionEndAt: user.subscriptionEndAt?.toISOString() ?? null,
    dailyResetAt: user.dailyResetAt.toISOString(),
    monthlyResetAt: user.monthlyResetAt.toISOString(),
    totalChats: user.chats.length,
    totalMessages,
    totalCost,
    totalPromptTokens,
    totalCompletionTokens,
    chats,
    payments: user.payments.map((p: any) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      plan: p.plan,
      purchaseType: p.purchaseType,
      createdAt: p.createdAt.toISOString(),
    })),
    deployments: user.deployments.map((d: any) => ({
      id: d.id,
      projectName: d.projectName,
      url: d.url,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
    })),
  };
}

// ── 14. Visit Analytics (daily, weekly, monthly) ─────────────────────────────

export interface DailyVisitRow {
  date: string;
  uniqueVisitors: number;
  totalViews: number;
}

export interface VisitAnalytics {
  daily: DailyVisitRow[];       // last 30 days
  todayVisitors: number;
  weekVisitors: number;
  monthVisitors: number;
  todayViews: number;
  weekViews: number;
  monthViews: number;
}

export async function getVisitAnalytics(): Promise<VisitAnalytics> {
  await requireAdmin();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(todayStart);
  monthStart.setDate(monthStart.getDate() - 30);

  // Daily breakdown for last 30 days
  // Use COALESCE(userId, meta->>'aid') to deduplicate visitors.
  // For old events without meta->>'aid', fall back to event id (each counts as 1).
  const daily = await prisma.$queryRaw<
    { date: Date; uniqueVisitors: bigint; totalViews: bigint }[]
  >`
    SELECT
      DATE("createdAt") AS "date",
      COUNT(DISTINCT COALESCE("userId", meta->>'aid', "id"::text)) AS "uniqueVisitors",
      COUNT(*) AS "totalViews"
    FROM "AnalyticsEvent"
    WHERE type = 'PAGE_VIEW'
      AND "createdAt" >= ${monthStart}
    GROUP BY DATE("createdAt")
    ORDER BY "date" ASC
  `;

  // Aggregated counts
  const [todayAgg, weekAgg, monthAgg] = await Promise.all([
    prisma.$queryRaw<{ visitors: bigint; views: bigint }[]>`
      SELECT
        COUNT(DISTINCT COALESCE("userId", meta->>'aid', "id"::text)) AS "visitors",
        COUNT(*) AS "views"
      FROM "AnalyticsEvent"
      WHERE type = 'PAGE_VIEW' AND "createdAt" >= ${todayStart}
    `,
    prisma.$queryRaw<{ visitors: bigint; views: bigint }[]>`
      SELECT
        COUNT(DISTINCT COALESCE("userId", meta->>'aid', "id"::text)) AS "visitors",
        COUNT(*) AS "views"
      FROM "AnalyticsEvent"
      WHERE type = 'PAGE_VIEW' AND "createdAt" >= ${weekStart}
    `,
    prisma.$queryRaw<{ visitors: bigint; views: bigint }[]>`
      SELECT
        COUNT(DISTINCT COALESCE("userId", meta->>'aid', "id"::text)) AS "visitors",
        COUNT(*) AS "views"
      FROM "AnalyticsEvent"
      WHERE type = 'PAGE_VIEW' AND "createdAt" >= ${monthStart}
    `,
  ]);

  return {
    daily: daily.map((r: any) => ({
      date: r.date.toISOString().slice(0, 10),
      uniqueVisitors: Number(r.uniqueVisitors),
      totalViews: Number(r.totalViews),
    })),
    todayVisitors: Number(todayAgg[0]?.visitors ?? 0),
    weekVisitors: Number(weekAgg[0]?.visitors ?? 0),
    monthVisitors: Number(monthAgg[0]?.visitors ?? 0),
    todayViews: Number(todayAgg[0]?.views ?? 0),
    weekViews: Number(weekAgg[0]?.views ?? 0),
    monthViews: Number(monthAgg[0]?.views ?? 0),
  };
}
