import { Resend } from "resend";

let resend: Resend | null = null;

function getResendClient() {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendVerificationEmail(email: string, token: string) {
  const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 40px 0;">
            <table role="presentation" style="max-width: 480px; margin: 0 auto; background-color: #18181b; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
              <tr>
                <td style="padding: 40px 32px; text-align: center;">
                  <!-- Logo -->
                  <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #a855f7, #6366f1); border-radius: 12px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 24px;">🌙</span>
                  </div>
                  
                  <!-- Heading -->
                  <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 8px;">Подтверждение email</h1>
                  <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 32px;">Введите код ниже для завершения регистрации</p>
                  
                  <!-- OTP Code -->
                  <div style="background-color: #27272a; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                    <p style="color: #ffffff; font-size: 36px; font-weight: 700; letter-spacing: 8px; margin: 0;">${token}</p>
                  </div>
                  
                  <!-- Info -->
                  <p style="color: #71717a; font-size: 13px; margin: 0;">
                    Код действителен в течение 15 минут.<br>
                    Если вы не запрашивали этот код, проигнорируйте это письмо.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 24px 32px; background-color: #0f0f10; border-top: 1px solid rgba(255,255,255,0.05);">
                  <p style="color: #52525b; font-size: 12px; margin: 0; text-align: center;">
                    © ${new Date().getFullYear()} Moonely. Все права защищены.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const { error } = await getResendClient().emails.send({
    from: "Moonely <noreply@support.moonely.ru>",
    to: email,
    subject: `${token} - Код подтверждения Moonely`,
    html: htmlTemplate,
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export function generateOTP(): string {
  // Use cryptographically secure random number generator
  const crypto = require('crypto');
  const randomBytes = crypto.randomBytes(4);
  const randomNumber = randomBytes.readUInt32BE(0);
  // Generate 6-digit OTP (100000-999999)
  return (100000 + (randomNumber % 900000)).toString();
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 40px 0;">
            <table role="presentation" style="max-width: 480px; margin: 0 auto; background-color: #18181b; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
              <tr>
                <td style="padding: 40px 32px; text-align: center;">
                  <!-- Logo -->
                  <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #a855f7, #6366f1); border-radius: 12px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 24px;">🌙</span>
                  </div>
                  
                  <!-- Heading -->
                  <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 8px;">Сброс пароля</h1>
                  <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 32px;">Введите код ниже для сброса пароля</p>
                  
                  <!-- OTP Code -->
                  <div style="background-color: #27272a; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                    <p style="color: #ffffff; font-size: 36px; font-weight: 700; letter-spacing: 8px; margin: 0;">${token}</p>
                  </div>
                  
                  <!-- Info -->
                  <p style="color: #71717a; font-size: 13px; margin: 0;">
                    Код действителен в течение 30 минут.<br>
                    Если вы не запрашивали сброс пароля, проигнорируйте это письмо.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 24px 32px; background-color: #0f0f10; border-top: 1px solid rgba(255,255,255,0.05);">
                  <p style="color: #52525b; font-size: 12px; margin: 0; text-align: center;">
                    © ${new Date().getFullYear()} Moonely. Все права защищены.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const { error } = await getResendClient().emails.send({
    from: "Moonely <noreply@support.moonely.ru>",
    to: email,
    subject: `${token} - Код для сброса пароля Moonely`,
    html: htmlTemplate,
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
