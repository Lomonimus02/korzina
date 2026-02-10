import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

// YooMoney Wallet Number
const YOOMONEY_RECEIVER = "4100119006815874";

// Plan Configurations
const PLANS = {
  STARTER: {
    amount: 890.00,
    credits: 25,
    name: "Стартовый",
  },
  ADVANCED: {
    amount: 2990.00,
    credits: 100,
    name: "Продвинутый",
  },
};

export async function POST(req: Request) {
  console.log("💳 [Payment Create] Request received");

  try {
    // 1. Auth Check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log("❌ [Payment Create] Unauthorized - no session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    console.log("✅ [Payment Create] User authenticated:", userId);

    // 2. Parse Request
    const body = await req.json();
    const { plan } = body;

    const planConfig = PLANS[plan as keyof typeof PLANS];
    if (!planConfig) {
      console.log("❌ [Payment Create] Invalid plan:", plan);
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // 3. Create PENDING Transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: userId,
        amount: planConfig.amount,
        status: "PENDING",
      },
    });
    console.log("✅ [Payment Create] Transaction created:", transaction.id);

    // 4. Build YooMoney QuickPay URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    
    const yooMoneyUrl = new URL("https://yoomoney.ru/quickpay/confirm.xml");
    yooMoneyUrl.searchParams.append("receiver", YOOMONEY_RECEIVER);
    yooMoneyUrl.searchParams.append("quickpay-form", "shop");
    yooMoneyUrl.searchParams.append("targets", `${planConfig.name} - ${planConfig.credits} Credits`);
    yooMoneyUrl.searchParams.append("sum", planConfig.amount.toFixed(2));
    yooMoneyUrl.searchParams.append("label", transaction.id); // CRITICAL: Transaction ID for webhook matching
    yooMoneyUrl.searchParams.append("paymentType", "AC"); // Card payment
    yooMoneyUrl.searchParams.append("successURL", `${baseUrl}/payment/success?orderId=${transaction.id}`);

    console.log("✅ [Payment Create] YooMoney URL generated:", yooMoneyUrl.toString());

    return NextResponse.json({ 
      url: yooMoneyUrl.toString(),
      transactionId: transaction.id 
    });

  } catch (error) {
    console.error("❌ [Payment Create] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
