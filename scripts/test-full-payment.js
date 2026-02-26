/**
 * Полный тест платёжной системы без реальной оплаты
 * 
 * Этот скрипт:
 * 1. Создает платёж в БД напрямую
 * 2. Симулирует webhook от ЮКасса
 * 3. Проверяет, что кредиты начислены
 * 
 * Использование:
 *   node scripts/test-full-payment.js <email> <plan>
 *   node scripts/test-full-payment.js <email> - <purchaseType>
 * 
 * Примеры:
 *   node scripts/test-full-payment.js user@example.com STARTER
 *   node scripts/test-full-payment.js user@example.com PRO
 *   node scripts/test-full-payment.js user@example.com - LIFETIME_PACK
 *   node scripts/test-full-payment.js user@example.com - TOPUP_PACK
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WEBHOOK_URL = 'http://localhost:3000/api/payment/webhook/yookassa';

// Конфигурация тарифов
const PLANS = {
  STARTER: { amount: 390, credits: 40, description: 'Старт (40 генераций)' },
  CREATOR: { amount: 990, credits: 150, description: 'Создатель (150 генераций)' },
  PRO: { amount: 1490, credits: 300, description: 'Про (300 генераций)' },
  STUDIO: { amount: 2490, credits: 600, description: 'Студия (600 генераций)' },
  AGENCY: { amount: 5990, credits: 1500, description: 'Агентство (1500 генераций)' },
};

const PACKS = {
  LIFETIME_PACK: { amount: 1290, credits: 100, description: 'Копилка (100 вечных кредитов)' },
  TOPUP_PACK: { amount: 290, credits: 25, description: 'Дополнительный пакет (25 вечных кредитов)' },
};

async function testFullPayment() {
  const email = process.argv[2];
  const planArg = process.argv[3] || 'STARTER';
  const purchaseTypeArg = process.argv[4];

  if (!email) {
    console.log('❌ Укажи email пользователя:');
    console.log('');
    console.log('Использование:');
    console.log('  node scripts/test-full-payment.js <email> <plan>');
    console.log('  node scripts/test-full-payment.js <email> - <purchaseType>');
    console.log('');
    console.log('Примеры:');
    console.log('  node scripts/test-full-payment.js user@example.com STARTER');
    console.log('  node scripts/test-full-payment.js user@example.com PRO');
    console.log('  node scripts/test-full-payment.js user@example.com - LIFETIME_PACK');
    console.log('');
    console.log('Доступные планы: STARTER, CREATOR, PRO, STUDIO, AGENCY');
    console.log('Доступные пакеты: LIFETIME_PACK, TOPUP_PACK');
    process.exit(1);
  }

  // Определяем тип покупки
  let purchaseType = 'SUBSCRIPTION';
  let plan = planArg;
  let config;

  if (planArg === '-' && purchaseTypeArg) {
    purchaseType = purchaseTypeArg;
    plan = null;
    config = PACKS[purchaseType];
  } else {
    config = PLANS[plan];
  }

  if (!config) {
    console.log('❌ Неизвестный план или тип пакета');
    process.exit(1);
  }

  try {
    // 1. Находим пользователя
    console.log(`\n🔍 Ищем пользователя: ${email}...`);
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('❌ Пользователь не найден. Проверь email.');
      process.exit(1);
    }

    console.log(`✅ Пользователь найден: ${user.id}`);
    console.log(`   Текущий план: ${user.plan}`);
    console.log(`   Текущие credits: ${user.credits}`);
    console.log(`   Текущие lifetimeCredits: ${user.lifetimeCredits || 0}`);
    console.log(`   subscriptionEndAt: ${user.subscriptionEndAt || 'не установлено'}`);

    // 2. Создаем платёж в БД
    console.log(`\n💳 Создаем платёж...`);
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: config.amount,
        currency: 'RUB',
        status: 'PENDING',
        plan: plan,
        purchaseType: purchaseType,
        creditsAmount: config.credits,
        description: `Moonely - ${config.description}`,
      },
    });
    console.log(`✅ Платёж создан: ${payment.id}`);

    // 3. Симулируем webhook
    console.log(`\n📤 Отправляем тестовый webhook...`);
    const webhookPayload = {
      type: 'notification',
      event: 'payment.succeeded',
      object: {
        id: 'test-yookassa-id-' + Date.now(),
        status: 'succeeded',
        amount: {
          value: config.amount.toFixed(2),
          currency: 'RUB'
        },
        description: `Moonely - ${config.description}`,
        metadata: {
          userId: user.id,
          internalPaymentId: payment.id,
          plan: plan || '',
          purchaseType: purchaseType,
        },
        created_at: new Date().toISOString(),
        captured_at: new Date().toISOString(),
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
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));

    if (!data.success) {
      console.log('\n⚠️ Webhook не был обработан успешно');
      process.exit(1);
    }

    // 4. Проверяем результат
    console.log(`\n🔍 Проверяем результат...`);
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    const updatedPayment = await prisma.payment.findUnique({
      where: { id: payment.id },
    });

    console.log(`\n📊 РЕЗУЛЬТАТЫ:`);
    console.log(`═══════════════════════════════════════════`);
    console.log(`   Payment status: ${updatedPayment.status}`);
    
    if (purchaseType === 'SUBSCRIPTION') {
      console.log(`\n   [ПОДПИСКА ${plan}]`);
      console.log(`   Ожидаемые credits: ${config.credits}`);
      console.log(`   Фактические credits: ${updatedUser.credits}`);
      console.log(`   Plan: ${user.plan} → ${updatedUser.plan}`);
      console.log(`   subscriptionEndAt: ${updatedUser.subscriptionEndAt}`);
      
      const creditsOk = updatedUser.credits >= config.credits;
      const planOk = updatedUser.plan === plan;
      const subOk = updatedUser.subscriptionEndAt !== null;
      
      console.log(`\n   ✅ Credits начислены: ${creditsOk ? 'ДА' : 'НЕТ ❌'}`);
      console.log(`   ✅ Plan обновлён: ${planOk ? 'ДА' : 'НЕТ ❌'}`);
      console.log(`   ✅ Подписка установлена: ${subOk ? 'ДА' : 'НЕТ ❌'}`);
    } else {
      console.log(`\n   [ПАКЕТ ${purchaseType}]`);
      console.log(`   Ожидаемые lifetimeCredits: +${config.credits}`);
      console.log(`   lifetimeCredits: ${user.lifetimeCredits || 0} → ${updatedUser.lifetimeCredits}`);
      console.log(`   Plan: ${updatedUser.plan} (не должен меняться)`);
      
      const creditsOk = (updatedUser.lifetimeCredits || 0) >= (user.lifetimeCredits || 0) + config.credits;
      const planUnchanged = updatedUser.plan === user.plan;
      
      console.log(`\n   ✅ Lifetime credits начислены: ${creditsOk ? 'ДА' : 'НЕТ ❌'}`);
      console.log(`   ✅ Plan не изменился: ${planUnchanged ? 'ДА' : 'НЕТ ❌'}`);
    }
    
    console.log(`═══════════════════════════════════════════\n`);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testFullPayment();
