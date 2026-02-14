import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/db";

// Plan credits based on amount
function getCreditsForAmount(amount: number): number {
  // Round to handle floating point issues
  const roundedAmount = Math.round(amount);
  
  if (roundedAmount >= 3590) {
    return 999999; // Pro (безлимит)
  } else if (roundedAmount >= 1590) {
    return 100; // Продвинутый
  } else if (roundedAmount >= 490) {
    return 50;  // Стартовый
  }
  return 0;
}

export async function GET() {
  console.log("🔔 [Webhook] GET request received - endpoint is reachable");
  return new NextResponse("YooMoney Webhook Endpoint. Use POST for notifications.", { status: 200 });
}

export async function POST(req: Request) {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("💰 [Webhook] POST request received at:", new Date().toISOString());
  console.log("═══════════════════════════════════════════════════════════");

  try {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: Parse Form Data (YooMoney sends application/x-www-form-urlencoded)
    // ═══════════════════════════════════════════════════════════
    const contentType = req.headers.get("content-type") || "";
    console.log("📋 [Webhook] Content-Type:", contentType);

    let data: Record<string, string>;

    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      data = Object.fromEntries(formData) as Record<string, string>;
      console.log("✅ [Webhook] Form data parsed successfully");
    } else {
      console.error("❌ [Webhook] Unsupported Content-Type:", contentType);
      return new NextResponse("Unsupported Content-Type", { status: 400 });
    }

    // Only log full data in development (may contain PII)
    if (process.env.NODE_ENV !== 'production') {
      console.log("📦 [Webhook] Received data:", JSON.stringify(data, null, 2));
    } else {
      console.log("📦 [Webhook] Received notification for label:", data.label || 'unknown');
    }

    // Extract all fields from YooMoney notification
    const {
      notification_type,
      operation_id,
      amount,
      currency,
      datetime,
      sender,
      codepro,
      label,
      sha1_hash,
      test_notification,
    } = data;

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Handle Test Notifications
    // ═══════════════════════════════════════════════════════════
    if (test_notification === "true") {
      console.log("🧪 [Webhook] Test notification received - returning 200 OK");
      return new NextResponse("Test OK", { status: 200 });
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Validate Required Fields
    // ═══════════════════════════════════════════════════════════
    if (!notification_type || !operation_id || !amount || !sha1_hash || !label) {
      console.error("❌ [Webhook] Missing required fields");
      console.error("   notification_type:", notification_type);
      console.error("   operation_id:", operation_id);
      console.error("   amount:", amount);
      console.error("   sha1_hash:", sha1_hash);
      console.error("   label:", label);
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Verify SHA1 Hash (SECURITY CRITICAL)
    // ═══════════════════════════════════════════════════════════
    const secret = process.env.YOOMONEY_SECRET;

    if (!secret) {
      console.error("❌ [Webhook] YOOMONEY_SECRET not configured in environment");
      return new NextResponse("Server configuration error", { status: 500 });
    }

    // YooMoney Hash Formula:
    // sha1(notification_type&operation_id&amount&currency&datetime&sender&codepro&notification_secret&label)
    const hashString = [
      notification_type,
      operation_id,
      amount,
      currency || "643",
      datetime,
      sender || "",
      codepro || "false",
      secret,
      label,
    ].join("&");

    const calculatedHash = crypto.createHash("sha1").update(hashString).digest("hex");

    // Only log in development - NEVER log secrets in production
    if (process.env.NODE_ENV !== 'production') {
      console.log("🔐 [Webhook] Hash Verification:");
      console.log("   String to hash:", hashString.replace(secret, "***SECRET***"));
      console.log("   Calculated:", calculatedHash);
      console.log("   Received:", sha1_hash);
      console.log("   Match:", calculatedHash === sha1_hash ? "✅ YES" : "❌ NO");
    }

    // Hash verification is REQUIRED for security
    const SKIP_HASH_CHECK = false;
    
    if (!SKIP_HASH_CHECK && calculatedHash !== sha1_hash) {
      console.error("❌ [Webhook] HASH MISMATCH - Possible fraud attempt!");
      return new NextResponse("Invalid hash", { status: 400 });
    }

    if (SKIP_HASH_CHECK) {
      console.log("⚠️ [Webhook] Hash check SKIPPED for debugging");
    } else {
      console.log("✅ [Webhook] Hash verified successfully");
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Find Transaction by Label
    // ═══════════════════════════════════════════════════════════
    console.log("🔍 [Webhook] Looking for transaction with label:", label);

    const transaction = await prisma.transaction.findUnique({
      where: { id: label },
      include: { user: true },
    });

    if (!transaction) {
      console.error("❌ [Webhook] Transaction not found for label:", label);
      return new NextResponse("Transaction not found", { status: 404 });
    }

    console.log("✅ [Webhook] Transaction found:");
    console.log("   ID:", transaction.id);
    console.log("   User ID:", transaction.userId);
    console.log("   Expected Amount:", transaction.amount);
    console.log("   Current Status:", transaction.status);

    // ═══════════════════════════════════════════════════════════
    // STEP 6: Check if Already Processed (Idempotency)
    // ═══════════════════════════════════════════════════════════
    if (transaction.status === "PAID") {
      console.log("⚠️ [Webhook] Transaction already processed - returning 200 OK");
      return new NextResponse("Already processed", { status: 200 });
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 7: Verify Amount
    // ═══════════════════════════════════════════════════════════
    const paidAmount = parseFloat(amount);
    const expectedAmount = transaction.amount;

    console.log("💵 [Webhook] Amount verification:");
    console.log("   Paid:", paidAmount);
    console.log("   Expected:", expectedAmount);

    // Allow small tolerance for floating point and fees
    if (paidAmount < expectedAmount - 0.5) {
      console.error("❌ [Webhook] Insufficient amount paid");
      // Still return 200 to acknowledge receipt (prevent YooMoney retries)
      return new NextResponse("Insufficient amount", { status: 200 });
    }

    console.log("✅ [Webhook] Amount verified");

    // ═══════════════════════════════════════════════════════════
    // STEP 8: Determine Credits and Plan based on Amount
    // ═══════════════════════════════════════════════════════════
    // NOTE: This is a legacy YooMoney webhook. New system uses ЮКасса (yookassa).
    const creditsToAdd = getCreditsForAmount(paidAmount);
    let newPlan: "FREE" | "STARTER" | "CREATOR" | "PRO" | "STUDIO" | "AGENCY" = "FREE";
    
    if (paidAmount >= 5990) {
      newPlan = "AGENCY";
    } else if (paidAmount >= 2490) {
      newPlan = "STUDIO";
    } else if (paidAmount >= 1490) {
      newPlan = "PRO";
    } else if (paidAmount >= 990) {
      newPlan = "CREATOR";
    } else if (paidAmount >= 390) {
      newPlan = "STARTER";
    }

    console.log("📊 [Webhook] Plan calculation:");
    console.log("   Credits to add:", creditsToAdd);
    console.log("   New plan:", newPlan);

    // ═══════════════════════════════════════════════════════════
    // STEP 9: Update Transaction & User (Atomic)
    // ═══════════════════════════════════════════════════════════
    console.log("🔄 [Webhook] Updating database...");

    await prisma.$transaction([
      // Update transaction status
      prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "PAID",
          providerId: operation_id,
        },
      }),
      // Update user: Add credits + Upgrade plan
      prisma.user.update({
        where: { id: transaction.userId },
        data: {
          credits: { increment: creditsToAdd },
          plan: newPlan,
        },
      }),
    ]);

    console.log("═══════════════════════════════════════════════════════════");
    console.log("✅ [Webhook] SUCCESS! User upgraded");
    console.log("   User ID:", transaction.userId);
    console.log("   Credits Added:", creditsToAdd);
    console.log("   New Plan:", newPlan);
    console.log("═══════════════════════════════════════════════════════════");

    return new NextResponse("OK", { status: 200 });

  } catch (error) {
    console.error("═══════════════════════════════════════════════════════════");
    console.error("❌ [Webhook] CRITICAL ERROR:", error);
    console.error("═══════════════════════════════════════════════════════════");
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(`Internal Error: ${errorMessage}`, { status: 500 });
  }
}
