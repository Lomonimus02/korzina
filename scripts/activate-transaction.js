// Скрипт для ручной активации транзакции
// Запуск: node scripts/activate-transaction.js <transaction_id>

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PRO_CREDITS = 100;

async function activateTransaction(transactionId) {
  console.log(`\n🔍 Ищу транзакцию: ${transactionId}\n`);

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { user: true },
  });

  if (!transaction) {
    console.error('❌ Транзакция не найдена!');
    process.exit(1);
  }

  console.log('📋 Информация о транзакции:');
  console.log(`   ID: ${transaction.id}`);
  console.log(`   User ID: ${transaction.userId}`);
  console.log(`   User Email: ${transaction.user.email}`);
  console.log(`   Amount: ${transaction.amount} RUB`);
  console.log(`   Status: ${transaction.status}`);
  console.log(`   Created: ${transaction.createdAt}`);
  console.log('');

  if (transaction.status === 'PAID') {
    console.log('⚠️ Транзакция уже активирована!');
    console.log(`   User Credits: ${transaction.user.credits}`);
    console.log(`   User Plan: ${transaction.user.plan}`);
    process.exit(0);
  }

  console.log('🔄 Активирую транзакцию...\n');

  await prisma.$transaction([
    prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'PAID',
        providerId: 'MANUAL_ACTIVATION',
      },
    }),
    prisma.user.update({
      where: { id: transaction.userId },
      data: {
        credits: { increment: PRO_CREDITS },
        plan: 'PRO',
      },
    }),
  ]);

  const updatedUser = await prisma.user.findUnique({
    where: { id: transaction.userId },
  });

  console.log('✅ Транзакция успешно активирована!');
  console.log(`   User Credits: ${updatedUser.credits}`);
  console.log(`   User Plan: ${updatedUser.plan}`);
}

const transactionId = process.argv[2];

if (!transactionId) {
  console.log('Usage: node scripts/activate-transaction.js <transaction_id>');
  console.log('\nПример:');
  console.log('  node scripts/activate-transaction.js abc123-def456-...');
  process.exit(1);
}

activateTransaction(transactionId)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
