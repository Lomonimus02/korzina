import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  // Поддержка обоих параметров: paymentId (новый) и orderId (старый)
  const paymentId = searchParams.get("paymentId") || searchParams.get("orderId");

  if (!paymentId) {
    return new NextResponse("Missing paymentId", { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    // Сначала пробуем найти в новой модели Payment (ЮКасса)
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { status: true, userId: true, plan: true, amount: true },
    });

    if (payment) {
      // Security check: убеждаемся, что платёж принадлежит пользователю
      if (payment.userId !== userId) {
        return new NextResponse("Payment not found", { status: 404 });
      }

      // Маппинг статусов Payment -> старый формат
      const statusMap: Record<string, string> = {
        PENDING: "PENDING",
        SUCCEEDED: "PAID",
        CANCELED: "CANCELED",
        WAITING_FOR_CAPTURE: "PENDING",
      };

      return NextResponse.json({ 
        status: statusMap[payment.status] || payment.status,
        plan: payment.plan,
        amount: payment.amount,
      });
    }

    // Fallback: ищем в старой модели Transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: paymentId },
      select: { status: true, userId: true },
    });

    if (!transaction) {
      return new NextResponse("Payment not found", { status: 404 });
    }

    // Security check: убеждаемся, что транзакция принадлежит пользователю
    if (transaction.userId !== userId) {
      return new NextResponse("Payment not found", { status: 404 });
    }

    return NextResponse.json({ status: transaction.status });
  } catch (error) {
    console.error("[Payment Check] Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

