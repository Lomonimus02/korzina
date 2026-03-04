/**
 * Создаёт (или сбрасывает) тестового FREE-пользователя для проверки отображения лимитов.
 * Запуск: node scripts/create-test-user.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const TEST_EMAIL = "testfree@moonely.test";
const TEST_PASSWORD = "Test1234!";

async function main() {
  console.log("🔧 Создаём тестового FREE-пользователя...\n");

  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    update: {
      // Сбрасываем в чистое состояние — как только что созданный аккаунт
      credits: 0,
      lifetimeCredits: 0,
      plan: "FREE",
      isVerified: true,
      emailVerified: new Date(),
      dailyGenerations: 0,
      monthlyGenerations: 0,
      dailyResetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),   // завтра
      monthlyResetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1), // начало след. месяца
    },
    create: {
      email: TEST_EMAIL,
      password: hashedPassword,
      isVerified: true,
      emailVerified: new Date(),
      plan: "FREE",
      credits: 0,
      lifetimeCredits: 0,
      dailyGenerations: 0,
      monthlyGenerations: 0,
      dailyResetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      monthlyResetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
    },
  });

  console.log("✅ Тестовый пользователь готов!");
  console.log("─────────────────────────────────────────");
  console.log(`  📧 Email:    ${TEST_EMAIL}`);
  console.log(`  🔑 Пароль:   ${TEST_PASSWORD}`);
  console.log(`  📋 Plan:     ${user.plan}`);
  console.log(`  💳 Credits:  ${user.credits}`);
  console.log(`  📅 Дневных генераций использовано:   ${user.dailyGenerations}`);
  console.log(`  📅 Месячных генераций использовано:  ${user.monthlyGenerations}`);
  console.log("─────────────────────────────────────────");
  console.log("\n👉 Войдите на сайте используя эти данные.");
  console.log("   В сайдбаре должно отображаться: '15 / 15 ген.'");
  console.log("   На странице /account должно быть:  '15 ген. осталось в месяце'");
}

main()
  .catch((e) => {
    console.error("❌ Ошибка:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
