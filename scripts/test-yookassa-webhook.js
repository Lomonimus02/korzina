/**
 * Скрипт для тестирования webhook ЮКасса локально
 * Симулирует уведомление payment.succeeded
 * 
 * Использование:
 * 1. Создай платёж через /api/payment/create (нажми "Купить" в UI)
 * 2. Скопируй paymentId из URL редиректа или из консоли
 * 3. Запусти: node scripts/test-yookassa-webhook.js <paymentId>
 */

const WEBHOOK_URL = 'http://localhost:3000/api/payment/webhook/yookassa';

async function testWebhook() {
  // Получаем paymentId из аргументов или используем тестовый
  const paymentId = process.argv[2];
  
  if (!paymentId) {
    console.log('❌ Укажи paymentId: node scripts/test-yookassa-webhook.js <paymentId>');
    console.log('');
    console.log('Как получить paymentId:');
    console.log('1. Нажми "Купить" на http://localhost:3000/pricing');
    console.log('2. В URL редиректа найди параметр paymentId');
    console.log('   Или посмотри в Prisma Studio (http://localhost:5555) таблицу Payment');
    process.exit(1);
  }

  // Симулируем webhook от ЮКасса
  const webhookPayload = {
    type: 'notification',
    event: 'payment.succeeded',
    object: {
      id: 'test-yookassa-id-' + Date.now(), // ID от ЮКасса (симуляция)
      status: 'succeeded',
      amount: {
        value: '50.00',
        currency: 'RUB'
      },
      description: 'Подписка Moonely - Стартовый (25 генераций)',
      metadata: {
        userId: 'will-be-found-by-internalPaymentId',
        internalPaymentId: paymentId, // Наш внутренний ID платежа
        plan: 'STARTER'
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
      console.log('  - User: credits должны увеличиться на 25');
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
