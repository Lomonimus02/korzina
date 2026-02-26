import { NextResponse } from "next/server";
import prisma from "@/lib/db";

const MAX_VERIFICATION_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return new NextResponse("Введите email и код подтверждения", { status: 400 });
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return new NextResponse("Неверный формат кода", { status: 400 });
    }

    // First, check if there's any token for this email (to track attempts)
    const existingTokens = await prisma.verificationToken.findMany({
      where: { identifier: email },
    });

    // Check if max attempts exceeded across all tokens for this email
    const totalAttempts = existingTokens.reduce((sum, t) => sum + t.attempts, 0);
    if (totalAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      // Delete all tokens for this email
      await prisma.verificationToken.deleteMany({
        where: { identifier: email },
      });
      return new NextResponse("Превышено количество попыток. Зарегистрируйтесь снова.", { status: 429 });
    }

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: email,
          token: code,
        },
      },
    });

    if (!verificationToken) {
      // Increment attempts on the most recent token for this email
      if (existingTokens.length > 0) {
        await prisma.verificationToken.update({
          where: {
            identifier_token: {
              identifier: existingTokens[0].identifier,
              token: existingTokens[0].token,
            },
          },
          data: { attempts: { increment: 1 } },
        });
      }
      return new NextResponse("Неверный код подтверждения", { status: 400 });
    }

    // Check if token has expired
    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: email,
            token: code,
          },
        },
      });
      return new NextResponse("Срок действия кода истёк. Зарегистрируйтесь снова.", { status: 400 });
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return new NextResponse("Пользователь не найден", { status: 404 });
    }

    // Update user to verified
    await prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        emailVerified: new Date(),
      },
    });

    // Delete the used verification token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token: code,
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Email успешно подтверждён" 
    });
  } catch (error) {
    console.error("VERIFICATION_ERROR", error);
    return new NextResponse("Внутренняя ошибка сервера", { status: 500 });
  }
}
