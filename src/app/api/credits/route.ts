import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

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
    },
  });

  if (!user) {
    return new NextResponse("User not found", { status: 404 });
  }

  // Для FREE плана возвращаем оставшиеся генерации
  // Для платных планов - сумму credits + lifetimeCredits
  const totalCredits = user.plan === 'FREE' 
    ? 0 
    : (user.credits || 0) + (user.lifetimeCredits || 0);

  return NextResponse.json({ 
    credits: totalCredits,
    regularCredits: user.credits || 0,
    lifetimeCredits: user.lifetimeCredits || 0,
    plan: user.plan,
    dailyGenerations: user.dailyGenerations || 0,
    monthlyGenerations: user.monthlyGenerations || 0,
  });
}
