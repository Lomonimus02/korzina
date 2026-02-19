const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({
    take: 3,
    select: {
      email: true,
      plan: true,
      credits: true,
      lifetimeCredits: true,
    }
  });
  console.log(JSON.stringify(users, null, 2));
  await p.$disconnect();
}

main();
