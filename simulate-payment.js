// simulate-payment.js
const crypto = require('crypto');

// 1. НАСТРОЙКИ (ЗАПОЛНИ ЭТО)
const YOUR_SECRET = 'rvcwvAslmeDCT2lNdHVZAcwU'; // Скопируй из .env YOOMONEY_SECRET
const TRANSACTION_ID = 'aacd8bca-f21e-44d2-a9d7-2c582e500dda'; // Возьми из Prisma Studio (статус PENDING)
const AMOUNT = '2.00'; // Сумма как в транзакции
const URL = 'http://localhost:3000/api/payment/webhook/yoomoney'; // Локальный адрес

// 2. Данные, которые шлет ЮMoney
const params = {
  notification_type: 'p2p-incoming',
  operation_id: '123456789test',
  amount: AMOUNT,
  currency: '643', // Рубли
  datetime: new Date().toISOString(),
  sender: '410010000000000',
  codepro: 'false',
  label: TRANSACTION_ID, // Сюда мы кладем ID заказа
  notification_secret: YOUR_SECRET
};

// 3. Расчет хеша (ТОЧНО КАК В ЮMONEY)
// Порядок полей важен!
const stringToHash = [
  params.notification_type,
  params.operation_id,
  params.amount,
  params.currency,
  params.datetime,
  params.sender,
  params.codepro,
  YOUR_SECRET, // Секрет участвует в хеше, но не передается в запросе
  params.label
].join('&');

const sha1_hash = crypto.createHash('sha1').update(stringToHash).digest('hex');

// 4. Отправка запроса
async function sendWebhook() {
  // Формируем тело запроса (убираем секрет из отправки)
  const body = new URLSearchParams();
  for (const key in params) {
    if (key !== 'notification_secret') {
      body.append(key, params[key]);
    }
  }
  body.append('sha1_hash', sha1_hash);
  body.append('test_notification', 'true'); // Флаг теста

  console.log('📡 Отправляю фейковый платеж...');
  console.log('URL:', URL);
  console.log('Transaction ID:', TRANSACTION_ID);

  try {
    const res = await fetch(URL, {
      method: 'POST',
      body: body, // Отправляем как форму!
    });

    const text = await res.text();
    console.log(`\nСтатус ответа: ${res.status}`);
    console.log(`Тело ответа: ${text}`);
    
    if (res.status === 200) {
        console.log("✅ УСПЕХ! Сервер принял платеж.");
    } else {
        console.log("❌ ОШИБКА! Сервер отклонил.");
    }
  } catch (e) {
    console.error('Ошибка сети:', e);
  }
}

sendWebhook();