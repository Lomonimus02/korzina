import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateOTP, sendPasswordResetEmail } from "../../../../../lib/mail";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return new NextResponse("Email обязателен", { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({ success: true });
    }

    // Check for existing token with cooldown (prevent spam)
    const existingToken = await prisma.passwordResetToken.findFirst({
      where: {
        identifier: email,
        expires: { gt: new Date() },
      },
    });

    // If token was created less than 60 seconds ago, enforce cooldown
    if (existingToken) {
      const tokenAge = Date.now() - (existingToken.expires.getTime() - 30 * 60 * 1000);
      if (tokenAge < 60 * 1000) {
        return new NextResponse("Подождите минуту перед повторной отправкой", { status: 429 });
      }
    }

    // Delete any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { identifier: email },
    });

    // Generate new OTP
    const otp = generateOTP();

    // Create new token with 30 minute expiration
    await prisma.passwordResetToken.create({
      data: {
        identifier: email,
        token: otp,
        expires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      },
    });

    // Send password reset email
    await sendPasswordResetEmail(email, otp);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return new NextResponse("Ошибка сервера", { status: 500 });
  }
}
