import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";
import { FREE_PLAN_LIMITS } from "@/lib/yookassa-types";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { 
      credits: true, 
      lifetimeCredits: true,
      plan: true,
      dailyGenerations: true,
      monthlyGenerations: true,
      dailyResetAt: true,
      monthlyResetAt: true,
    },
  });

  if (!user) {
    return new NextResponse("User not found", { status: 404 });
  }

  const now = new Date();

  // Для FREE плана вычисляем оставшиеся генерации с учётом сброса счётчиков
  let dailyUsed = user.dailyGenerations || 0;
  let monthlyUsed = user.monthlyGenerations || 0;

  if (!user.dailyResetAt || now >= user.dailyResetAt) {
    dailyUsed = 0;
  }
  if (!user.monthlyResetAt || now >= user.monthlyResetAt) {
    monthlyUsed = 0;
  }

  const remainingDaily = Math.max(0, FREE_PLAN_LIMITS.dailyGenerations - dailyUsed);
  const remainingMonthly = Math.max(0, FREE_PLAN_LIMITS.monthlyGenerations - monthlyUsed);

  // Для платных планов - сумму credits + lifetimeCredits
  const totalCredits = user.plan === 'FREE' 
    ? remainingMonthly
    : (user.credits || 0) + (user.lifetimeCredits || 0);

  return NextResponse.json({ 
    credits: totalCredits,
    regularCredits: user.credits || 0,
    lifetimeCredits: user.lifetimeCredits || 0,
    plan: user.plan,
    dailyGenerations: dailyUsed,
    monthlyGenerations: monthlyUsed,
    remainingDaily,
    remainingMonthly,
    freeDailyLimit: FREE_PLAN_LIMITS.dailyGenerations,
    freeMonthlyLimit: FREE_PLAN_LIMITS.monthlyGenerations,
  });
}
