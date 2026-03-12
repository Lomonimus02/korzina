import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";

export async function POST() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    if (!userId) {
      return NextResponse.json({ error: "No user id" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const trialToken = cookieStore.get("moonely_trial_token")?.value;

    if (!trialToken) {
      return NextResponse.json({ linked: false, reason: "no_token" });
    }

    // Find trial chat by token
    const trialChat = await prisma.chat.findUnique({
      where: { trialToken },
    });

    if (!trialChat) {
      // Token invalid or already consumed — just clean up cookie
      const res = NextResponse.json({ linked: false, reason: "no_chat" });
      res.cookies.set("moonely_trial_token", "", { maxAge: 0, path: "/" });
      return res;
    }

    // Already linked to this user
    if (trialChat.userId === userId) {
      const res = NextResponse.json({ linked: true, reason: "already_linked" });
      res.cookies.set("moonely_trial_token", "", { maxAge: 0, path: "/" });
      return res;
    }

    // Already linked to a different user — don't steal
    if (trialChat.userId && trialChat.userId !== userId) {
      const res = NextResponse.json({ linked: false, reason: "owned_by_other" });
      res.cookies.set("moonely_trial_token", "", { maxAge: 0, path: "/" });
      return res;
    }

    // Link trial chat to user and count as 1 used daily generation
    // Also set dailyResetAt to tomorrow midnight so the counter doesn't get
    // reset to 0 on the user's first authenticated /api/chat request
    const tomorrowMidnight = new Date();
    tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);
    tomorrowMidnight.setHours(0, 0, 0, 0);

    await prisma.$transaction([
      prisma.chat.update({
        where: { id: trialChat.id },
        data: { userId, trialToken: null },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          dailyGenerations: { increment: 1 },
          dailyResetAt: tomorrowMidnight,
        },
      }),
    ]);

    const res = NextResponse.json({ linked: true });
    res.cookies.set("moonely_trial_token", "", { maxAge: 0, path: "/" });
    return res;
  } catch (error) {
    console.error("TRIAL_LINK_ERROR", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
