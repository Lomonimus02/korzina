/**
 * Скрипт для тестирования webhook ЮКасса локально
 * Симулирует уведомление payment.succeeded
 * 
 * Использование:
 * 1. Создай платёж через /api/payment/create (нажми "Купить" в UI)
 * 2. Скопируй paymentId из URL редиректа или из консоли
 * 3. Запусти: node scripts/test-yookassa-webhook.js <paymentId> [plan] [purchaseType]
 * 
 * Примеры:
 *   node scripts/test-yookassa-webhook.js abc123                          # Подписка STARTER
 *   node scripts/test-yookassa-webhook.js abc123 CREATOR                  # Подписка CREATOR
 *   node scripts/test-yookassa-webhook.js abc123 PRO                     # Подписка PRO
 *   node scripts/test-yookassa-webhook.js abc123 - LIFETIME_PACK          # Пакет "Копилка" (100 кредитов)
 *   node scripts/test-yookassa-webhook.js abc123 - TOPUP_PACK             # Пакет "Дополнительный пакет" (25 кредитов)
 */

const WEBHOOK_URL = 'http://localhost:3000/api/payment/webhook/yookassa';

// Конфигурация тарифов (должна совпадать с yookassa-types.ts)
const PLANS = {
  STARTER: { amount: '390.00', credits: 40, description: 'Старт (40 генераций)' },
  CREATOR: { amount: '990.00', credits: 150, description: 'Создатель (150 генераций)' },
  PRO: { amount: '1490.00', credits: 300, description: 'Про (300 генераций)' },
  STUDIO: { amount: '2490.00', credits: 600, description: 'Студия (600 генераций)' },
  AGENCY: { amount: '5990.00', credits: 1500, description: 'Агентство (1500 генераций)' },
};

const PACKS = {
  LIFETIME_PACK: { amount: '1290.00', credits: 100, description: 'Копилка (100 вечных кредитов)' },
  TOPUP_PACK: { amount: '290.00', credits: 25, description: 'Дополнительный пакет (25 вечных кредитов)' },
};

async function testWebhook() {
  // Получаем аргументы
  const paymentId = process.argv[2];
  const plan = process.argv[3] || 'STARTER';
  const purchaseType = process.argv[4] || 'SUBSCRIPTION';
  
  if (!paymentId) {
    console.log('❌ Укажи paymentId: node scripts/test-yookassa-webhook.js <paymentId> [plan] [purchaseType]');
    console.log('');
    console.log('Как получить paymentId:');
    console.log('1. Нажми "Купить" на http://localhost:3000/pricing');
    console.log('2. В URL редиректа найди параметр paymentId');
    console.log('   Или посмотри в Prisma Studio (http://localhost:5555) таблицу Payment');
    console.log('');
    console.log('Примеры:');
    console.log('  node scripts/test-yookassa-webhook.js abc123              # Подписка STARTER');
    console.log('  node scripts/test-yookassa-webhook.js abc123 PRO          # Подписка PRO');
    console.log('  node scripts/test-yookassa-webhook.js abc123 - LIFETIME_PACK  # Пакет "Копилка"');
    console.log('');
    console.log('Доступные планы: STARTER, CREATOR, PRO, STUDIO, AGENCY');
    console.log('Доступные пакеты: LIFETIME_PACK, TOPUP_PACK');
    process.exit(1);
  }

  // Определяем конфигурацию
  let config;
  let resolvedPlan = plan;
  
  if (purchaseType === 'SUBSCRIPTION') {
    config = PLANS[plan] || PLANS.STARTER;
  } else {
    config = PACKS[purchaseType] || PACKS.LIFETIME_PACK;
    resolvedPlan = ''; // Пакеты не меняют план
  }

  // Симулируем webhook от ЮКасса
  const webhookPayload = {
    type: 'notification',
    event: 'payment.succeeded',
    object: {
      id: 'test-yookassa-id-' + Date.now(), // ID от ЮКасса (симуляция)
      status: 'succeeded',
      amount: {
        value: config.amount,
        currency: 'RUB'
      },
      description: `Moonely - ${config.description}`,
      metadata: {
        userId: 'will-be-found-by-internalPaymentId',
        internalPaymentId: paymentId, // Наш внутренний ID платежа
        plan: resolvedPlan,
        purchaseType: purchaseType,
      },
      payment_method: {
        type: 'bank_card',
        id: 'test-pm-id',
        saved: false,
        card: {
          last4: '4444',
          expiry_month: '12',
          expiry_year: '2028',
          card_type: 'Visa'
        }
      },
      created_at: new Date().toISOString(),
      captured_at: new Date().toISOString(),
      test: true,
      paid: true,
      refundable: true
    }
  };

  console.log('📤 Отправляем тестовый webhook...');
  console.log('   URL:', WEBHOOK_URL);
  console.log('   Payment ID:', paymentId);
  console.log('   Plan:', resolvedPlan || '(none - пакет)');
  console.log('   Purchase Type:', purchaseType);
  console.log('   Amount:', config.amount, 'RUB');
  console.log('   Credits:', config.credits);
  console.log('');

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    const data = await response.json();
    
    console.log('📥 Ответ сервера:');
    console.log('   Status:', response.status);
    console.log('   Body:', JSON.stringify(data, null, 2));
    console.log('');

    if (data.success) {
      console.log('✅ Webhook обработан успешно!');
      console.log('');
      console.log('Проверь в Prisma Studio (http://localhost:5555):');
      console.log('  - Payment: статус должен быть SUCCEEDED');
      if (purchaseType === 'SUBSCRIPTION') {
        console.log(`  - User: credits должны стать ${config.credits}, plan=${plan}`);
        console.log('  - User: subscriptionEndAt должен быть установлен на +30 дней');
      } else {
        console.log(`  - User: lifetimeCredits должны увеличиться на ${config.credits}`);
        console.log('  - User: plan НЕ должен измениться (пакеты не меняют план)');
      }
    } else {
      console.log('⚠️ Webhook обработан, но без успеха:', data.message);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.log('');
    console.log('Убедись что dev-сервер запущен: npm run dev');
  }
}

testWebhook();
