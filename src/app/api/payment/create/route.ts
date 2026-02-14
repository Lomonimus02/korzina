import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";
import {
  YooKassaCreatePaymentRequest,
  YooKassaPayment,
  YOOKASSA_PLANS,
  YOOKASSA_PACKS,
  formatAmountForYooKassa,
  generateIdempotenceKey,
  createYooKassaAuthHeader,
} from "@/lib/yookassa-types";

// ЮКасса API URL
const YOOKASSA_API_URL = "https://api.yookassa.ru/v3/payments";

export async function POST(req: Request) {
  console.log("💳 [Payment Create] Запрос получен");

  try {
    // 1. Проверка авторизации
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log("❌ [Payment Create] Не авторизован - нет сессии");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userEmail = session.user.email;
    console.log("✅ [Payment Create] Пользователь авторизован:", userId);

    // 2. Парсинг запроса
    const body = await req.json();
    const { plan, purchaseType = 'SUBSCRIPTION' } = body;

    // Определяем конфигурацию в зависимости от типа покупки
    let planConfig: { amount: number; credits: number; description: string } | undefined;
    let resolvedPlan: string | null = null;
    let creditsAmount: number | null = null;

    if (purchaseType === 'SUBSCRIPTION') {
      // Для подписок - ищем в YOOKASSA_PLANS
      planConfig = YOOKASSA_PLANS[plan as keyof typeof YOOKASSA_PLANS];
      resolvedPlan = plan;
      if (planConfig) {
        creditsAmount = planConfig.credits;
      }
    } else {
      // Для пакетов - ищем в YOOKASSA_PACKS
      planConfig = YOOKASSA_PACKS[purchaseType as keyof typeof YOOKASSA_PACKS];
      resolvedPlan = null; // Пакеты не меняют план пользователя
      if (planConfig) {
        creditsAmount = planConfig.credits;
      }
    }

    if (!planConfig) {
      console.log("❌ [Payment Create] Неверный план или тип покупки:", plan, purchaseType);
      return NextResponse.json({ error: "Invalid plan or purchase type" }, { status: 400 });
    }

    // 2.5 Проверка ограничений на покупку
    // TOPUP_PACK доступен только пользователям с активной подпиской
    if (purchaseType === 'TOPUP_PACK') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
      });
      
      if (!user || user.plan === 'FREE') {
        console.log("❌ [Payment Create] TOPUP_PACK недоступен для FREE плана");
        return NextResponse.json({ 
          error: "TOPUP_PACK requires active subscription" 
        }, { status: 403 });
      }
    }

    // 3. Проверка наличия переменных окружения
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;
    
    if (!shopId || !secretKey) {
      console.error("❌ [Payment Create] Отсутствуют YOOKASSA_SHOP_ID или YOOKASSA_SECRET_KEY");
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 500 }
      );
    }

    // 4. Создание записи платежа в БД со статусом PENDING
    const payment = await prisma.payment.create({
      data: {
        userId: userId,
        amount: planConfig.amount,
        currency: "RUB",
        status: "PENDING",
        plan: resolvedPlan as any,
        purchaseType: purchaseType as any,
        creditsAmount: creditsAmount,
        description: planConfig.description,
      },
    });
    console.log("✅ [Payment Create] Платёж создан в БД:", payment.id, "Тип:", purchaseType);

    // 5. Формирование URL возврата
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const returnUrl = `${baseUrl}/payment/success?paymentId=${payment.id}`;

    // 6. Подготовка запроса к ЮКасса API
    const yookassaRequest: YooKassaCreatePaymentRequest = {
      amount: formatAmountForYooKassa(planConfig.amount),
      capture: true, // Одностадийный платёж (сразу списываем)
      confirmation: {
        type: "redirect",
        return_url: returnUrl,
      },
      description: planConfig.description,
      metadata: {
        userId: userId,
        internalPaymentId: payment.id,
        plan: resolvedPlan || '',
        purchaseType: purchaseType,
      },
      // Чек для 54-ФЗ (если нужен)
      receipt: userEmail ? {
        customer: {
          email: userEmail,
        },
        items: [
          {
            description: planConfig.description,
            quantity: "1",
            amount: formatAmountForYooKassa(planConfig.amount),
            vat_code: 1, // Без НДС (для упрощённой системы налогообложения)
            payment_subject: "service",
            payment_mode: "full_payment",
          },
        ],
      } : undefined,
    };

    // 7. Отправка запроса к ЮКасса
    console.log("📤 [Payment Create] Отправка запроса к ЮКасса API...");
    
    const idempotenceKey = generateIdempotenceKey();
    const authHeader = createYooKassaAuthHeader(shopId, secretKey);

    const yookassaResponse = await fetch(YOOKASSA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "Idempotence-Key": idempotenceKey,
      },
      body: JSON.stringify(yookassaRequest),
    });

    // 8. Обработка ответа от ЮКасса
    if (!yookassaResponse.ok) {
      const errorData = await yookassaResponse.text();
      console.error("❌ [Payment Create] Ошибка ЮКасса:", yookassaResponse.status, errorData);
      
      // Удаляем созданный платёж при ошибке
      await prisma.payment.delete({ where: { id: payment.id } });
      
      return NextResponse.json(
        { error: "Failed to create payment" },
        { status: 500 }
      );
    }

    const yookassaPayment: YooKassaPayment = await yookassaResponse.json();
    console.log("✅ [Payment Create] Платёж создан в ЮКасса:", yookassaPayment.id);

    // 9. Обновление записи платежа с ID от ЮКасса
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        yookassaId: yookassaPayment.id,
      },
    });

    // 10. Получение URL для редиректа
    const confirmationUrl = yookassaPayment.confirmation?.confirmation_url;
    
    if (!confirmationUrl) {
      console.error("❌ [Payment Create] Нет confirmation_url в ответе");
      return NextResponse.json(
        { error: "No confirmation URL received" },
        { status: 500 }
      );
    }

    console.log("✅ [Payment Create] URL для оплаты:", confirmationUrl);

    // 11. Возврат URL на фронтенд
    return NextResponse.json({
      url: confirmationUrl,
      paymentId: payment.id,
      yookassaId: yookassaPayment.id,
    });

  } catch (error) {
    console.error("❌ [Payment Create] Ошибка:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

