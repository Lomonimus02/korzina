import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  YooKassaWebhookEvent,
  YooKassaPayment,
  YOOKASSA_PLANS,
  YOOKASSA_PACKS,
} from "@/lib/yookassa-types";

/**
 * Webhook для обработки уведомлений от ЮКасса
 * Настройте URL в личном кабинете ЮКасса:
 * https://yourdomain.com/api/payment/webhook/yookassa
 * 
 * Валидация IP: ЮКасса отправляет запросы с IP:
 * - 185.71.76.0/27
 * - 185.71.77.0/27
 * - 77.75.153.0/25
 * - 77.75.154.128/25
 * - 2a02:5180::/32
 */

export async function POST(req: Request) {
  console.log("📨 [YooKassa Webhook] Получено уведомление");

  try {
    // 1. Парсинг тела запроса
    const body = await req.text();
    console.log("📄 [YooKassa Webhook] Тело запроса:", body);

    let webhookData: YooKassaWebhookEvent;
    try {
      webhookData = JSON.parse(body);
    } catch (parseError) {
      console.error("❌ [YooKassa Webhook] Ошибка парсинга JSON:", parseError);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // 2. Проверка типа события
    const eventType = webhookData.event || webhookData.type;
    console.log("📋 [YooKassa Webhook] Тип события:", eventType);

    // 3. Получение объекта платежа
    const paymentObject: YooKassaPayment = webhookData.object;
    
    if (!paymentObject) {
      console.error("❌ [YooKassa Webhook] Отсутствует object в уведомлении");
      return NextResponse.json({ error: "Missing payment object" }, { status: 400 });
    }

    const yookassaId = paymentObject.id;
    const status = paymentObject.status;
    const metadata = paymentObject.metadata;

    console.log("💳 [YooKassa Webhook] Payment ID:", yookassaId);
    console.log("📊 [YooKassa Webhook] Статус:", status);
    console.log("📝 [YooKassa Webhook] Metadata:", JSON.stringify(metadata));

    // 4. Обработка события payment.succeeded
    if (eventType === "payment.succeeded") {
      console.log("✅ [YooKassa Webhook] Обработка успешного платежа...");

      // Находим платёж в нашей БД по yookassaId или по internalPaymentId из metadata
      let payment = await prisma.payment.findUnique({
        where: { yookassaId: yookassaId },
        include: { user: true },
      });

      // Если не нашли по yookassaId, пробуем по internalPaymentId
      if (!payment && metadata?.internalPaymentId) {
        payment = await prisma.payment.findUnique({
          where: { id: metadata.internalPaymentId },
          include: { user: true },
        });
      }

      if (!payment) {
        console.error("❌ [YooKassa Webhook] Платёж не найден:", yookassaId);
        // Возвращаем 200, чтобы ЮКасса не повторяла запрос
        return NextResponse.json({ 
          success: false, 
          message: "Payment not found in database" 
        });
      }

      // Проверяем, не был ли платёж уже обработан
      if (payment.status === "SUCCEEDED") {
        console.log("⚠️ [YooKassa Webhook] Платёж уже обработан:", payment.id);
        return NextResponse.json({ 
          success: true, 
          message: "Payment already processed" 
        });
      }

      // 5. Определяем тип покупки и количество кредитов
      const plan = payment.plan || metadata?.plan;
      const purchaseType = payment.purchaseType || metadata?.purchaseType || 'SUBSCRIPTION';
      const user = payment.user;
      
      let creditsToAdd = 0;
      let isLifetimeCredits = false;
      
      if (purchaseType === 'SUBSCRIPTION') {
        // Для подписки - берем кредиты из конфига плана
        const planConfig = plan ? YOOKASSA_PLANS[plan as keyof typeof YOOKASSA_PLANS] : null;
        if (planConfig) {
          creditsToAdd = planConfig.credits;
        }
      } else {
        // Для пакетов - используем lifetimeCredits
        const packConfig = YOOKASSA_PACKS[purchaseType as keyof typeof YOOKASSA_PACKS];
        if (packConfig) {
          creditsToAdd = packConfig.credits;
          isLifetimeCredits = true;
        } else if (payment.creditsAmount) {
          // Fallback: из записи платежа
          creditsToAdd = payment.creditsAmount;
          isLifetimeCredits = true;
        }
      }

      console.log("🎁 [YooKassa Webhook] Кредитов к начислению:", creditsToAdd, "Тип:", purchaseType, "Lifetime:", isLifetimeCredits);

      // 6. Транзакционное обновление: статус платежа + кредиты пользователя
      await prisma.$transaction(async (tx) => {
        // Обновляем статус платежа
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCEEDED",
            yookassaId: yookassaId,
          },
        });

        if (purchaseType === 'SUBSCRIPTION' && creditsToAdd > 0) {
          // === ЛОГИКА ПОДПИСКИ ===
          const now = new Date();
          let newCredits = creditsToAdd;
          
          // Rollover: если подписка еще активна, добавляем к существующим кредитам
          if (user.subscriptionEndAt && user.subscriptionEndAt > now) {
            const existingCredits = user.credits || 0;
            newCredits = existingCredits + creditsToAdd;
            console.log("🔄 [YooKassa Webhook] Rollover! Существующих кредитов:", existingCredits, "Новых:", creditsToAdd, "Итого:", newCredits);
          }
          
          // Рассчитываем новый период подписки
          const subscriptionStartAt = now;
          const subscriptionEndAt = new Date(now);
          subscriptionEndAt.setMonth(subscriptionEndAt.getMonth() + 1);
          
          await tx.user.update({
            where: { id: payment.userId },
            data: {
              credits: newCredits,
              plan: plan ? (plan as any) : undefined,
              subscriptionStartAt: subscriptionStartAt,
              subscriptionEndAt: subscriptionEndAt,
            },
          });
          
          console.log("✅ [YooKassa Webhook] Подписка обновлена. План:", plan, "Кредиты:", newCredits, "Действует до:", subscriptionEndAt);
          
        } else if (isLifetimeCredits && creditsToAdd > 0) {
          // === ЛОГИКА ПАКЕТОВ (вечные кредиты) ===
          await tx.user.update({
            where: { id: payment.userId },
            data: {
              lifetimeCredits: {
                increment: creditsToAdd,
              },
              // Пакеты не меняют план пользователя
            },
          });
          
          console.log("✅ [YooKassa Webhook] Пакет активирован. Вечных кредитов добавлено:", creditsToAdd);
        }

        console.log("✅ [YooKassa Webhook] Обновлено: платёж", payment.id, ", пользователь", payment.userId);
      });

      console.log("🎉 [YooKassa Webhook] Платёж успешно обработан!");
      return NextResponse.json({ success: true });
    }

    // 7. Обработка события payment.canceled
    if (eventType === "payment.canceled") {
      console.log("❌ [YooKassa Webhook] Платёж отменён");

      const payment = await prisma.payment.findUnique({
        where: { yookassaId: yookassaId },
      });

      if (payment && payment.status !== "CANCELED") {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "CANCELED" },
        });
        console.log("✅ [YooKassa Webhook] Статус платежа обновлён на CANCELED");
      }

      return NextResponse.json({ success: true });
    }

    // 8. Обработка события payment.waiting_for_capture (для двухстадийных платежей)
    if (eventType === "payment.waiting_for_capture") {
      console.log("⏳ [YooKassa Webhook] Платёж ожидает подтверждения");
      
      // Для одностадийных платежей (capture: true) это событие не приходит
      // Но если используете двухстадийные, здесь нужно подтвердить платёж
      
      return NextResponse.json({ success: true });
    }

    // 9. Неизвестное событие - всё равно возвращаем 200
    console.log("⚠️ [YooKassa Webhook] Неизвестное событие:", eventType);
    return NextResponse.json({ 
      success: true, 
      message: `Event ${eventType} ignored` 
    });

  } catch (error) {
    console.error("❌ [YooKassa Webhook] Ошибка:", error);
    
    // ВАЖНО: Возвращаем 200, чтобы ЮКасса не повторяла запрос бесконечно
    // Логируем ошибку для отладки, но не блокируем
    return NextResponse.json({ 
      success: false, 
      error: "Internal error, but acknowledged" 
    });
  }
}

// Разрешаем GET для проверки доступности endpoint
export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    message: "YooKassa webhook endpoint is active" 
  });
}
