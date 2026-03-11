import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = ["BUTTON_CLICK", "PAGE_VIEW"];
const AID_COOKIE = "_aid"; // anonymous visitor id
const AID_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

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

    // Anonymous visitor identification via cookie
    let aid = req.cookies.get(AID_COOKIE)?.value;
    let aidIsNew = false;
    if (!aid) {
      aid = randomUUID();
      aidIsNew = true;
    }

    // Merge aid into meta so the SQL query can use meta->>'aid' for dedup
    const enrichedMeta = { ...(meta ?? {}), aid };

    const event = await prisma.analyticsEvent.create({
      data: {
        userId,
        type,
        page,
        meta: enrichedMeta,
      },
    });

    const res = NextResponse.json({ success: true, id: event.id }, { status: 201 });

    // Set the anonymous ID cookie if it was just generated
    if (aidIsNew) {
      res.cookies.set(AID_COOKIE, aid, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: AID_MAX_AGE,
      });
    }

    return res;
  } catch (error) {
    console.error("[Analytics Track]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
