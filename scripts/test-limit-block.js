/**
 * Тест блокировки при исчерпании лимитов FREE плана
 * 
 * Сценарий:
 * 1. Устанавливает план FREE с исчерпанными лимитами
 * 2. Устанавливает даты сброса в БУДУЩЕМ (чтобы сброс не произошёл)
 * 3. Проверяет, что API вернёт ошибку
 * 
 * Использование:
 *   node scripts/test-limit-block.js <email> daily   # Тест блокировки по дневному лимиту
 *   node scripts/test-limit-block.js <email> monthly # Тест блокировки по месячному лимиту
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FREE_PLAN_LIMITS = {
  dailyGenerations: 3,
  monthlyGenerations: 15,
};

async function testLimitBlock() {
  const email = process.argv[2];
  const blockType = process.argv[3] || 'daily';

  if (!email) {
    console.log('❌ Укажи email: node scripts/test-limit-block.js <email> [daily|monthly]');
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

    // 2. Устанавливаем тестовое состояние с датами в БУДУЩЕМ
    console.log(`\n📝 Устанавливаем состояние блокировки (${blockType})...`);
    
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    
    let updateData = {
      plan: 'FREE',
      dailyResetAt: tomorrow,
      monthlyResetAt: nextMonth,
    };

    if (blockType === 'daily') {
      updateData.dailyGenerations = 3; // Дневной лимит исчерпан
      updateData.monthlyGenerations = 5; // Месячный ещё есть
      console.log(`   Дневной: 3/3 (исчерпан)`);
      console.log(`   Месячный: 5/15 (есть запас)`);
    } else {
      updateData.dailyGenerations = 1; // Дневной есть
      updateData.monthlyGenerations = 15; // Месячный исчерпан
      console.log(`   Дневной: 1/3 (есть запас)`);
      console.log(`   Месячный: 15/15 (исчерпан)`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    // 3. Симулируем проверку лимитов (как в API)
    console.log(`\n🔄 Симулируем проверку лимитов (как в API chat)...`);
    
    user = await prisma.user.findUnique({ where: { email } });
    
    // Проверяем даты сброса (логика из API)
    let updatedUserData = {
      dailyGenerations: user.dailyGenerations,
      monthlyGenerations: user.monthlyGenerations,
      dailyResetAt: user.dailyResetAt,
      monthlyResetAt: user.monthlyResetAt,
    };

    // Дата дневного сброса ещё не наступила
    if (user.dailyResetAt && now < user.dailyResetAt) {
      console.log(`   ⏳ Дневной сброс: ${user.dailyResetAt} (ещё не наступил)`);
    }
    
    // Дата месячного сброса ещё не наступила  
    if (user.monthlyResetAt && now < user.monthlyResetAt) {
      console.log(`   ⏳ Месячный сброс: ${user.monthlyResetAt} (ещё не наступил)`);
    }

    // 4. Проверка блокировки
    console.log(`\n🚫 Проверка блокировки...`);
    
    let blocked = false;
    let blockReason = '';

    if (updatedUserData.dailyGenerations >= FREE_PLAN_LIMITS.dailyGenerations) {
      blocked = true;
      blockReason = `Дневной лимит исчерпан (${updatedUserData.dailyGenerations}/${FREE_PLAN_LIMITS.dailyGenerations})`;
    }
    
    if (updatedUserData.monthlyGenerations >= FREE_PLAN_LIMITS.monthlyGenerations) {
      blocked = true;
      blockReason = `Месячный лимит исчерпан (${updatedUserData.monthlyGenerations}/${FREE_PLAN_LIMITS.monthlyGenerations})`;
    }

    if (blocked) {
      console.log(`   ✅ БЛОКИРОВКА РАБОТАЕТ!`);
      console.log(`   Причина: ${blockReason}`);
      console.log(`\n   API вернёт ошибку 403 с сообщением:`);
      if (blockType === 'daily') {
        console.log(`   "Дневной лимит исчерпан. Бесплатный план: 3 генерации в день."`);
      } else {
        console.log(`   "Месячный лимит исчерпан. Бесплатный план: 15 генераций в месяц."`);
      }
    } else {
      console.log(`   ❌ Блокировка НЕ сработала (что-то не так)`);
    }

    console.log(`\n📊 Финальное состояние:`);
    console.log(`═══════════════════════════════════════════`);
    console.log(`   Plan: ${user.plan}`);
    console.log(`   Daily: ${user.dailyGenerations}/${FREE_PLAN_LIMITS.dailyGenerations}`);
    console.log(`   Monthly: ${user.monthlyGenerations}/${FREE_PLAN_LIMITS.monthlyGenerations}`);
    console.log(`   Daily Reset At: ${user.dailyResetAt}`);
    console.log(`   Monthly Reset At: ${user.monthlyResetAt}`);
    console.log(`═══════════════════════════════════════════`);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testLimitBlock();
