import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";

const ALLOWED_TYPES = ["BUTTON_CLICK", "PAGE_VIEW"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, page, meta } = body;

    if (!type || !page) {
      return NextResponse.json(
        { error: "Missing required fields: type, page" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Get userId from session if authenticated (optional)
    let userId: string | null = null;
    try {
      const session = await getAuthSession();
      userId = (session?.user as any)?.id ?? null;
    } catch {
      // Anonymous event — userId stays null
    }

    const event = await prisma.analyticsEvent.create({
      data: {
        userId,
        type,
        page,
        meta: meta ?? undefined,
      },
    });

    return NextResponse.json({ success: true, id: event.id }, { status: 201 });
  } catch (error) {
    console.error("[Analytics Track]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
