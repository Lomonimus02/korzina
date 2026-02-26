/**
 * Тест rollover кредитов при продлении подписки
 * 
 * Сценарий:
 * 1. Устанавливает подписку с N кредитов
 * 2. Использует некоторые кредиты
 * 3. Симулирует продление до окончания
 * 4. Проверяет, что остаток перенёсся
 * 
 * Использование:
 *   node scripts/test-rollover.js <email>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WEBHOOK_URL = 'http://localhost:3000/api/payment/webhook/yookassa';

async function testRollover() {
  const email = process.argv[2];

  if (!email) {
    console.log('❌ Укажи email: node scripts/test-rollover.js <email>');
    process.exit(1);
  }

  try {
    // 1. Находим пользователя
    console.log(`\n🔍 Ищем пользователя: ${email}...`);
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.log('❌ Пользователь не найден');
      process.exit(1);
    }

    // 2. Устанавливаем начальное состояние: активная подписка с 50 кредитами
    console.log(`\n📝 Устанавливаем начальное состояние...`);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 10); // Подписка истекает через 10 дней
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: 'STARTER',
        credits: 50, // Начальные кредиты
        subscriptionStartAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // Началась 20 дней назад
        subscriptionEndAt: endDate, // Истекает через 10 дней
      },
    });

    user = await prisma.user.findUnique({ where: { email } });
    console.log(`   Plan: ${user.plan}`);
    console.log(`   Credits: ${user.credits}`);
    console.log(`   Subscription ends: ${user.subscriptionEndAt}`);
    console.log(`   ✅ Подписка активна, кредиты = 50`);

    // 3. "Используем" 30 кредитов (остаётся 20)
    console.log(`\n📉 Симулируем использование 30 кредитов...`);
    await prisma.user.update({
      where: { id: user.id },
      data: { credits: 20 },
    });
    console.log(`   Credits after usage: 20`);

    // 4. Создаем платёж за продление (тариф CREATOR = 150 кредитов)
    console.log(`\n💳 Создаем платёж за продление на CREATOR...`);
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: 990,
        currency: 'RUB',
        status: 'PENDING',
        plan: 'CREATOR',
        purchaseType: 'SUBSCRIPTION',
        creditsAmount: 150,
        description: 'Moonely - Создатель (150 генераций)',
      },
    });
    console.log(`   Payment ID: ${payment.id}`);

    // 5. Симулируем webhook
    console.log(`\n📤 Симулируем успешную оплату (webhook)...`);
    const webhookPayload = {
      type: 'notification',
      event: 'payment.succeeded',
      object: {
        id: 'test-rollover-' + Date.now(),
        status: 'succeeded',
        amount: { value: '990.00', currency: 'RUB' },
        description: 'Moonely - Создатель (150 генераций)',
        metadata: {
          userId: user.id,
          internalPaymentId: payment.id,
          plan: 'CREATOR',
          purchaseType: 'SUBSCRIPTION',
        },
        created_at: new Date().toISOString(),
        test: true,
        paid: true,
      }
    };

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });

    const data = await response.json();
    console.log(`   Webhook response: ${response.status} - ${JSON.stringify(data)}`);

    // 6. Проверяем результат
    console.log(`\n📊 РЕЗУЛЬТАТ ROLLOVER:`);
    console.log(`═══════════════════════════════════════════`);
    
    const finalUser = await prisma.user.findUnique({ where: { id: user.id } });
    const expectedCredits = 20 + 150; // Остаток + новые
    
    console.log(`   Было кредитов: 20 (остаток)`);
    console.log(`   Новых кредитов: 150 (CREATOR plan)`);
    console.log(`   Ожидаемый итог: ${expectedCredits}`);
    console.log(`   Фактический итог: ${finalUser.credits}`);
    console.log(``);
    console.log(`   Plan: ${finalUser.plan}`);
    console.log(`   Subscription End: ${finalUser.subscriptionEndAt}`);
    console.log(``);
    
    if (finalUser.credits === expectedCredits) {
      console.log(`   ✅ ROLLOVER РАБОТАЕТ! Кредиты перенесены правильно.`);
    } else if (finalUser.credits === 150) {
      console.log(`   ❌ ROLLOVER НЕ РАБОТАЕТ! Кредиты перезаписаны без переноса остатка.`);
    } else {
      console.log(`   ⚠️ Неожиданный результат. Проверь логику webhook.`);
    }
    
    console.log(`═══════════════════════════════════════════\n`);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testRollover();
