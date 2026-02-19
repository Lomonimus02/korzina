/**
 * Тест лимитов FREE плана
 * 
 * Проверяет:
 * - Дневной лимит (3 генерации)
 * - Месячный лимит (15 генераций)
 * - Сброс счетчиков
 * 
 * Использование:
 *   node scripts/test-free-limits.js <email>
 *   node scripts/test-free-limits.js <email> reset   # Сбросить счетчики
 *   node scripts/test-free-limits.js <email> set <daily> <monthly>  # Установить счетчики
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFreeLimits() {
  const email = process.argv[2];
  const action = process.argv[3];

  if (!email) {
    console.log('❌ Укажи email пользователя:');
    console.log('');
    console.log('Использование:');
    console.log('  node scripts/test-free-limits.js <email>              # Показать текущее состояние');
    console.log('  node scripts/test-free-limits.js <email> reset        # Сбросить счетчики лимитов');
    console.log('  node scripts/test-free-limits.js <email> set 2 14     # Установить daily=2, monthly=14');
    console.log('  node scripts/test-free-limits.js <email> setplan FREE # Установить план FREE');
    console.log('');
    process.exit(1);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('❌ Пользователь не найден');
      process.exit(1);
    }

    if (action === 'reset') {
      // Сбрасываем счетчики
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          dailyGenerations: 0,
          monthlyGenerations: 0,
          dailyResetAt: tomorrow,
          monthlyResetAt: nextMonth,
        },
      });
      console.log('✅ Счетчики сброшены');
      
    } else if (action === 'set') {
      const daily = parseInt(process.argv[4]) || 0;
      const monthly = parseInt(process.argv[5]) || 0;
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          dailyGenerations: daily,
          monthlyGenerations: monthly,
        },
      });
      console.log(`✅ Счетчики установлены: daily=${daily}, monthly=${monthly}`);
      
    } else if (action === 'setplan') {
      const plan = process.argv[4] || 'FREE';
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: plan },
      });
      console.log(`✅ План установлен: ${plan}`);
    }

    // Показываем текущее состояние
    const updatedUser = await prisma.user.findUnique({
      where: { email },
    });

    console.log(`\n📊 Состояние пользователя: ${email}`);
    console.log(`═══════════════════════════════════════════`);
    console.log(`   Plan: ${updatedUser.plan}`);
    console.log(`   Credits: ${updatedUser.credits}`);
    console.log(`   Lifetime Credits: ${updatedUser.lifetimeCredits || 0}`);
    console.log(``);
    console.log(`   📅 FREE план лимиты:`);
    console.log(`   Daily Generations: ${updatedUser.dailyGenerations}/3`);
    console.log(`   Monthly Generations: ${updatedUser.monthlyGenerations}/15`);
    console.log(`   Daily Reset At: ${updatedUser.dailyResetAt || 'не установлено'}`);
    console.log(`   Monthly Reset At: ${updatedUser.monthlyResetAt || 'не установлено'}`);
    console.log(``);
    console.log(`   📆 Подписка:`);
    console.log(`   Subscription Start: ${updatedUser.subscriptionStartAt || 'не установлено'}`);
    console.log(`   Subscription End: ${updatedUser.subscriptionEndAt || 'не установлено'}`);
    console.log(`═══════════════════════════════════════════`);

    if (updatedUser.plan === 'FREE') {
      const dailyLeft = Math.max(0, 3 - updatedUser.dailyGenerations);
      const monthlyLeft = Math.max(0, 15 - updatedUser.monthlyGenerations);
      
      console.log(`\n   ⚡ Осталось генераций:`);
      console.log(`   Сегодня: ${dailyLeft}`);
      console.log(`   В этом месяце: ${monthlyLeft}`);
      
      if (dailyLeft === 0) {
        console.log(`\n   ⚠️ Дневной лимит исчерпан!`);
      }
      if (monthlyLeft === 0) {
        console.log(`   ⚠️ Месячный лимит исчерпан!`);
      }
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testFreeLimits();
