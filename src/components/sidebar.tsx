import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { SidebarClient } from "./sidebar-client";

export const dynamic = "force-dynamic";

const FREE_DAILY_LIMIT = 3;
const FREE_MONTHLY_LIMIT = 15;

export async function Sidebar() {
  const session = await getAuthSession();
  
  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      chats: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) return null;

  // Calculate remaining free generations for FREE plan users
  const now = new Date();
  const dailyUsed = (!user.dailyResetAt || now >= user.dailyResetAt) ? 0 : (user.dailyGenerations || 0);
  const monthlyUsed = (!user.monthlyResetAt || now >= user.monthlyResetAt) ? 0 : (user.monthlyGenerations || 0);
  const remainingDaily = Math.max(0, FREE_DAILY_LIMIT - dailyUsed);
  const remainingMonthly = Math.max(0, FREE_MONTHLY_LIMIT - monthlyUsed);

  return <SidebarClient user={user} remainingDaily={remainingDaily} remainingMonthly={remainingMonthly} freeDailyLimit={FREE_DAILY_LIMIT} freeMonthlyLimit={FREE_MONTHLY_LIMIT} />;
}
