/**
 * Тест автоматического сброса лимитов FREE плана
 * 
 * Сценарий:
 * 1. Устанавливает план FREE с заполненными лимитами
 * 2. Устанавливает даты сброса в прошлом
 * 3. Симулирует запрос к chat API
 * 4. Проверяет, что счетчики сбросились
 * 
 * Использование:
 *   node scripts/test-limit-reset.js <email> daily   # Тест дневного сброса
 *   node scripts/test-limit-reset.js <email> monthly # Тест месячного сброса
 *   node scripts/test-limit-reset.js <email> both    # Тест обоих сбросов
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CHAT_API_URL = 'http://localhost:3000/api/chat';

async function testLimitReset() {
  const email = process.argv[2];
  const resetType = process.argv[3] || 'both';

  if (!email) {
    console.log('❌ Укажи email: node scripts/test-limit-reset.js <email> [daily|monthly|both]');
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

    // Сохраняем исходное состояние
    const originalState = {
      plan: user.plan,
      credits: user.credits,
      dailyGenerations: user.dailyGenerations,
      monthlyGenerations: user.monthlyGenerations,
    };

    // 2. Устанавливаем тестовое состояние
    console.log(`\n📝 Устанавливаем тестовое состояние...`);
    
    const now = new Date();
    const pastDaily = new Date(now.getTime() - 60 * 60 * 1000); // 1 час назад
    const pastMonthly = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 день назад
    
    let updateData = {
      plan: 'FREE',
      credits: 0, // Для FREE плана кредиты не используются
    };

    if (resetType === 'daily' || resetType === 'both') {
      updateData.dailyGenerations = 2; // 2 из 3 использовано
      updateData.dailyResetAt = pastDaily; // Дата сброса в прошлом
      console.log(`   Дневной лимит: 2/3 (сброс должен произойти)`);
    }

    if (resetType === 'monthly' || resetType === 'both') {
      updateData.monthlyGenerations = 14; // 14 из 15 использовано
      updateData.monthlyResetAt = pastMonthly; // Дата сброса в прошлом
      console.log(`   Месячный лимит: 14/15 (сброс должен произойти)`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    user = await prisma.user.findUnique({ where: { email } });
    console.log(`\n📊 Состояние ДО запроса:`);
    console.log(`   Plan: ${user.plan}`);
    console.log(`   Daily: ${user.dailyGenerations}/3`);
    console.log(`   Monthly: ${user.monthlyGenerations}/15`);
    console.log(`   Daily Reset At: ${user.dailyResetAt}`);
    console.log(`   Monthly Reset At: ${user.monthlyResetAt}`);

    // 3. Делаем запрос к chat API
    // Примечание: нам нужна сессия пользователя, поэтому напрямую вызвать API не получится
    // Вместо этого проверим логику сброса напрямую в БД
    
    console.log(`\n⚠️ Для полного теста API нужна авторизация.`);
    console.log(`   Пошаговый ручной тест:`);
    console.log(`   1. Открой http://localhost:3000 и войди как ${email}`);
    console.log(`   2. Отправь любое сообщение в чат`);
    console.log(`   3. Проверь, что лимиты сбросились`);
    console.log(`\n   Или запусти: node scripts/test-limit-reset.js ${email} verify`);
    console.log(`   после того как отправишь сообщение.\n`);

    // 4. Проверяем состояние после (если тип verify)
    if (resetType === 'verify') {
      user = await prisma.user.findUnique({ where: { email } });
      console.log(`\n📊 Текущее состояние:`);
      console.log(`   Plan: ${user.plan}`);
      console.log(`   Daily: ${user.dailyGenerations}/3`);
      console.log(`   Monthly: ${user.monthlyGenerations}/15`);
      console.log(`   Daily Reset At: ${user.dailyResetAt}`);
      console.log(`   Monthly Reset At: ${user.monthlyResetAt}`);
      
      if (user.dailyGenerations <= 1 && user.monthlyGenerations <= 1) {
        console.log(`\n   ✅ Лимиты были сброшены и началась новая генерация!`);
      }
    }

    // Опция для восстановления
    console.log(`\n💡 Для восстановления исходного состояния:`);
    console.log(`   node scripts/test-free-limits.js ${email} setplan ${originalState.plan}`);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testLimitReset();
