import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");

  if (!orderId) {
    return new NextResponse("Missing orderId", { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: orderId },
      select: { status: true, userId: true },
    });

    if (!transaction) {
      return new NextResponse("Transaction not found", { status: 404 });
    }

    // Security check: ensure the user owns this transaction
    const userId = (session.user as any).id;
    if (transaction.userId !== userId) {
      return new NextResponse("Transaction not found", { status: 404 });
    }

    return NextResponse.json({ status: transaction.status });
  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
