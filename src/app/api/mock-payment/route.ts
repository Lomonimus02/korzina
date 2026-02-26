import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

// DEV ONLY: Mock Payment Endpoint
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse("Not available in production", { status: 403 });
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { creditsToAdd } = await req.json();

    if (!creditsToAdd || typeof creditsToAdd !== 'number') {
      return new NextResponse("Invalid credits amount", { status: 400 });
    }

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        credits: {
          increment: creditsToAdd,
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      newCredits: user.credits,
      message: `Successfully added ${creditsToAdd} credits` 
    });
  } catch (error) {
    console.error("Mock payment error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
