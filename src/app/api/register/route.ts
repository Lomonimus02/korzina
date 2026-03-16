import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { sendVerificationEmail, generateOTP } from "../../../../lib/mail";

const SKIP_EMAIL_VERIFICATION = process.env.SKIP_EMAIL_VERIFICATION === "true";

export async function POST(req: Request) {
  try {
    const { email, password, ref } = await req.json();

    if (!email || !password) {
      return new NextResponse("Введите email и пароль", { status: 400 });
    }

    // Find referrer if ref code provided
    let referrer: { id: string } | null = null;
    if (ref) {
      referrer = await prisma.user.findUnique({
        where: { referralCode: ref },
        select: { id: true },
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // If user exists but not verified, allow re-registration (resend OTP)
      if (!existingUser.isVerified && !SKIP_EMAIL_VERIFICATION) {
        // Delete old verification tokens for this email
        await prisma.verificationToken.deleteMany({
          where: { identifier: email },
        });

        // Generate new OTP
        const otp = generateOTP();
        const expires = new Date(Date.now() + 15 * 60 * 1000);

        await prisma.verificationToken.create({
          data: { identifier: email, token: otp, expires },
        });

        await sendVerificationEmail(email, otp);

        return NextResponse.json({ 
          success: true, 
          email,
          message: "Код подтверждения отправлен повторно" 
        });
      }

      return new NextResponse("Пользователь уже существует", { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // DEV MODE: Skip email verification
    if (SKIP_EMAIL_VERIFICATION) {
      if (referrer) {
        await prisma.$transaction([
          prisma.user.create({
            data: {
              email,
              password: hashedPassword,
              isVerified: true,
              referredById: referrer.id,
            },
          }),
          prisma.user.update({
            where: { id: referrer.id },
            data: { credits: { increment: 10 } },
          }),
        ]);
      } else {
        await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            isVerified: true,
          },
        });
      }

      return NextResponse.json({ 
        success: true, 
        verified: true,
        message: "Аккаунт создан (режим разработки)" 
      });
    }

    // PRODUCTION: Normal flow with email verification
    const otp = generateOTP();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    if (referrer) {
      await prisma.$transaction([
        prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            isVerified: false,
            referredById: referrer.id,
          },
        }),
        prisma.user.update({
          where: { id: referrer.id },
          data: { credits: { increment: 10 } },
        }),
      ]);
    } else {
      await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          isVerified: false,
        },
      });
    }

    await prisma.verificationToken.create({
      data: { identifier: email, token: otp, expires },
    });

    await sendVerificationEmail(email, otp);

    return NextResponse.json({ 
      success: true, 
      email,
      message: "Код подтверждения отправлен на вашу почту" 
    });
  } catch (error) {
    console.error("REGISTRATION_ERROR", error);
    return new NextResponse("Внутренняя ошибка сервера", { status: 500 });
  }
}
