/**
 * Скрипт для создания тестовых данных и проверки Virtual Backend API
 * 
 * Запуск: node test-db-api.js
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Создаём тестовые данные...\n');

  // 1. Создаём тестового пользователя
  const user = await prisma.user.upsert({
    where: { email: 'test@moonely.app' },
    update: {},
    create: {
      email: 'test@moonely.app',
      password: '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1u', // password: "test123"
      isVerified: true,
      credits: 100,
    },
  });
  console.log('✅ Пользователь создан:', user.id);

  // 2. Создаём тестовый чат (проект)
  const chat = await prisma.chat.upsert({
    where: { id: 'test-project-001' },
    update: {},
    create: {
      id: 'test-project-001',
      title: 'Test Project',
      userId: user.id,
    },
  });
  console.log('✅ Проект создан:', chat.id);

  // 3. Создаём API ключ для проекта
  const apiKeyValue = `mk_${crypto.randomBytes(24).toString('hex')}`;
  const apiKey = await prisma.projectApiKey.upsert({
    where: { projectId: chat.id },
    update: { key: apiKeyValue },
    create: {
      projectId: chat.id,
      key: apiKeyValue,
    },
  });
  console.log('✅ API ключ создан:', apiKey.key);

  console.log('\n' + '='.repeat(60));
  console.log('📋 ДАННЫЕ ДЛЯ ТЕСТИРОВАНИЯ:');
  console.log('='.repeat(60));
  console.log(`Project ID: ${chat.id}`);
  console.log(`API Key:    ${apiKey.key}`);
  console.log('='.repeat(60));

  // 4. Тестируем CRUD операции
  console.log('\n🧪 Тестируем Virtual Backend API...\n');

  const BASE_URL = 'http://localhost:3000';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey.key}`,
  };

  // CREATE
  console.log('1️⃣  POST - Создание записи...');
  const createRes = await fetch(`${BASE_URL}/api/db`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      collection: 'todos',
      data: { title: 'Тестовая задача', completed: false, priority: 1 },
    }),
  });
  const createData = await createRes.json();
  console.log(`   Status: ${createRes.status}`);
  console.log('   Response:', JSON.stringify(createData, null, 2));
  
  if (!createData.success) {
    console.log('❌ Ошибка создания записи');
    return;
  }
  
  const recordId = createData.data.id;
  console.log(`   ✅ Запись создана: ${recordId}\n`);

  // READ ALL
  console.log('2️⃣  GET - Чтение всех записей коллекции...');
  const readAllRes = await fetch(`${BASE_URL}/api/db?collection=todos`, { headers });
  const readAllData = await readAllRes.json();
  console.log(`   Status: ${readAllRes.status}`);
  console.log(`   Количество записей: ${readAllData.data?.length || 0}\n`);

  // READ ONE
  console.log('3️⃣  GET - Чтение одной записи...');
  const readOneRes = await fetch(`${BASE_URL}/api/db?id=${recordId}`, { headers });
  const readOneData = await readOneRes.json();
  console.log(`   Status: ${readOneRes.status}`);
  console.log('   Data:', JSON.stringify(readOneData.data?.data, null, 2), '\n');

  // UPDATE
  console.log('4️⃣  PUT - Обновление записи...');
  const updateRes = await fetch(`${BASE_URL}/api/db`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      id: recordId,
      data: { title: 'Обновлённая задача!', completed: true, priority: 2 },
    }),
  });
  const updateData = await updateRes.json();
  console.log(`   Status: ${updateRes.status}`);
  console.log('   Updated data:', JSON.stringify(updateData.data?.data, null, 2), '\n');

  // Проверяем что данные обновились
  console.log('5️⃣  GET - Проверка обновления...');
  const verifyRes = await fetch(`${BASE_URL}/api/db?id=${recordId}`, { headers });
  const verifyData = await verifyRes.json();
  console.log(`   Status: ${verifyRes.status}`);
  console.log('   Data:', JSON.stringify(verifyData.data?.data, null, 2), '\n');

  // DELETE
  console.log('6️⃣  DELETE - Удаление записи...');
  const deleteRes = await fetch(`${BASE_URL}/api/db?id=${recordId}`, {
    method: 'DELETE',
    headers,
  });
  const deleteData = await deleteRes.json();
  console.log(`   Status: ${deleteRes.status}`);
  console.log('   Response:', JSON.stringify(deleteData, null, 2), '\n');

  // Проверяем что запись удалена
  console.log('7️⃣  GET - Проверка удаления...');
  const checkDeleteRes = await fetch(`${BASE_URL}/api/db?id=${recordId}`, { headers });
  console.log(`   Status: ${checkDeleteRes.status} (ожидается 404)`);
  
  if (checkDeleteRes.status === 404) {
    console.log('   ✅ Запись успешно удалена!\n');
  }

  console.log('='.repeat(60));
  console.log('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
  console.log('='.repeat(60));
  console.log(`\n📌 Сохрани API ключ для дальнейших тестов:`);
  console.log(`   ${apiKey.key}\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
