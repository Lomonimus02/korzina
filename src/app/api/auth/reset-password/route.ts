import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Timing-safe comparison for OTP codes to prevent timing attacks.
 * Even if strings have different lengths, we pad them to ensure constant-time comparison.
 */
function timingSafeCompare(a: string, b: string): boolean {
  // Pad shorter string to match lengths (prevents length-based timing leaks)
  const maxLength = Math.max(a.length, b.length);
  const paddedA = a.padEnd(maxLength, "\0");
  const paddedB = b.padEnd(maxLength, "\0");
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(paddedA, "utf8"),
      Buffer.from(paddedB, "utf8")
    );
  } catch {
    return false;
  }
}

/**
 * Validates that the code is a 6-digit numeric string.
 * This prevents injection attacks and ensures proper format.
 */
function isValidOtpFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Validates email format to prevent injection attacks.
 */
function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validates password strength requirements.
 */
function isValidPassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 6) {
    return { valid: false, error: "Пароль должен быть не менее 6 символов" };
  }
  if (password.length > 128) {
    return { valid: false, error: "Пароль слишком длинный" };
  }
  return { valid: true };
}

export async function POST(request: Request) {
  // Add small random delay (50-150ms) to prevent timing attacks on user enumeration
  const randomDelay = 50 + Math.random() * 100;
  
  try {
    const body = await request.json();
    const { email, code, newPassword } = body;

    // Input validation
    if (!email || !code || !newPassword) {
      await new Promise(resolve => setTimeout(resolve, randomDelay));
      return new NextResponse("Все поля обязательны", { status: 400 });
    }

    // Sanitize and validate email
    const sanitizedEmail = email.toLowerCase().trim();
    if (!isValidEmailFormat(sanitizedEmail)) {
      await new Promise(resolve => setTimeout(resolve, randomDelay));
      return new NextResponse("Неверный формат email", { status: 400 });
    }

    // Validate OTP format (must be exactly 6 digits)
    if (!isValidOtpFormat(code)) {
      await new Promise(resolve => setTimeout(resolve, randomDelay));
      return new NextResponse("Код должен состоять из 6 цифр", { status: 400 });
    }

    // Validate password
    const passwordValidation = isValidPassword(newPassword);
    if (!passwordValidation.valid) {
      await new Promise(resolve => setTimeout(resolve, randomDelay));
      return new NextResponse(passwordValidation.error!, { status: 400 });
    }

    // Find the reset token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        identifier: sanitizedEmail,
        expires: { gt: new Date() },
      },
      select: {
        identifier: true,
        token: true,
        expires: true,
        attempts: true,
      },
    });

    if (!resetToken) {
      // Apply delay even when token not found to prevent user enumeration
      await new Promise(resolve => setTimeout(resolve, randomDelay));
      return new NextResponse("Код истёк или не найден. Запросите новый код.", { status: 400 });
    }

    // Check attempts (brute-force protection)
    if (resetToken.attempts >= 5) {
      // Delete the token after too many attempts
      await prisma.passwordResetToken.deleteMany({
        where: { identifier: sanitizedEmail },
      });
      await new Promise(resolve => setTimeout(resolve, randomDelay));
      return new NextResponse("Слишком много попыток. Запросите новый код.", { status: 400 });
    }

    // Timing-safe OTP verification to prevent timing attacks
    const isCodeValid = timingSafeCompare(resetToken.token, code);
    
    if (!isCodeValid) {
      // Increment attempts
      await prisma.passwordResetToken.updateMany({
        where: { identifier: sanitizedEmail },
        data: { attempts: { increment: 1 } },
      });
      await new Promise(resolve => setTimeout(resolve, randomDelay));
      return new NextResponse("Неверный код", { status: 400 });
    }

    // Hash new password with bcrypt (cost factor 10)
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password and mark email as verified (since they proved email access)
    const updatedUser = await prisma.user.update({
      where: { email: sanitizedEmail },
      data: { 
        password: hashedPassword,
        emailVerified: new Date(), // Mark as verified since user proved email access
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    // Delete the used token
    await prisma.passwordResetToken.deleteMany({
      where: { identifier: sanitizedEmail },
    });

    // Log successful password reset for security audit (without sensitive data)
    console.log(`[SECURITY] Password reset successful for user: ${updatedUser.id} at ${new Date().toISOString()}`);

    // Return success with autoLogin flag - client will handle the automatic sign-in
    // We do NOT return the password or create server-side session for security
    // The client already has the password in memory and will use signIn() with it
    return NextResponse.json({ 
      success: true,
      autoLogin: true,
      email: sanitizedEmail,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    // Generic error message to not leak information
    return new NextResponse("Ошибка сервера", { status: 500 });
  }
}
