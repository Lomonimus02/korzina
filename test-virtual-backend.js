/**
 * Test script for Virtual Backend API
 * 
 * Использование:
 * 1. Запусти сервер: npm run dev
 * 2. В другом терминале: node test-virtual-backend.js
 * 
 * Этот скрипт тестирует все CRUD операции Virtual Backend
 */

const BASE_URL = 'http://localhost:3000';

// Тестовый projectId (замени на реальный chatId из базы)
let TEST_PROJECT_ID = 'test-project-123';
let TEST_API_KEY = null;
let CREATED_RECORD_ID = null;

async function testWithSession() {
  console.log('\n🔐 === ТЕСТ С СЕССИЕЙ (требует логин в браузере) ===\n');
  console.log('⚠️  Для тестов с сессией нужно быть залогиненным в браузере');
  console.log('   и использовать куки. Используй Postman или браузер DevTools.\n');
}

async function testWithApiKey() {
  console.log('\n🔑 === ТЕСТ С API КЛЮЧОМ ===\n');
  
  if (!TEST_API_KEY) {
    console.log('❌ API ключ не установлен. Сначала создай его через UI или Postman:');
    console.log('   POST /api/db/keys { "projectId": "your-chat-id" }');
    console.log('\n💡 Для тестирования без базы данных, используй curl:\n');
    showCurlExamples();
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TEST_API_KEY}`
  };

  // 1. CREATE
  console.log('1️⃣  POST /api/db - Создание записи...');
  try {
    const createRes = await fetch(`${BASE_URL}/api/db`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        collection: 'todos',
        data: { title: 'Тестовая задача', completed: false, priority: 'high' }
      })
    });
    const createData = await createRes.json();
    console.log(`   Status: ${createRes.status}`);
    console.log('   Response:', JSON.stringify(createData, null, 2));
    
    if (createData.success && createData.data?.id) {
      CREATED_RECORD_ID = createData.data.id;
      console.log(`   ✅ Запись создана: ${CREATED_RECORD_ID}\n`);
    }
  } catch (e) {
    console.log(`   ❌ Ошибка: ${e.message}\n`);
  }

  // 2. READ ALL
  console.log('2️⃣  GET /api/db?collection=todos - Чтение всех записей...');
  try {
    const readRes = await fetch(`${BASE_URL}/api/db?collection=todos`, { headers });
    const readData = await readRes.json();
    console.log(`   Status: ${readRes.status}`);
    console.log(`   Записей: ${readData.data?.length || 0}\n`);
  } catch (e) {
    console.log(`   ❌ Ошибка: ${e.message}\n`);
  }

  // 3. READ ONE
  if (CREATED_RECORD_ID) {
    console.log(`3️⃣  GET /api/db?id=${CREATED_RECORD_ID} - Чтение одной записи...`);
    try {
      const readOneRes = await fetch(`${BASE_URL}/api/db?id=${CREATED_RECORD_ID}`, { headers });
      const readOneData = await readOneRes.json();
      console.log(`   Status: ${readOneRes.status}`);
      console.log('   Response:', JSON.stringify(readOneData, null, 2), '\n');
    } catch (e) {
      console.log(`   ❌ Ошибка: ${e.message}\n`);
    }
  }

  // 4. UPDATE
  if (CREATED_RECORD_ID) {
    console.log('4️⃣  PUT /api/db - Обновление записи...');
    try {
      const updateRes = await fetch(`${BASE_URL}/api/db`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: CREATED_RECORD_ID,
          data: { title: 'Обновлённая задача', completed: true, priority: 'low' }
        })
      });
      const updateData = await updateRes.json();
      console.log(`   Status: ${updateRes.status}`);
      console.log('   Response:', JSON.stringify(updateData, null, 2), '\n');
    } catch (e) {
      console.log(`   ❌ Ошибка: ${e.message}\n`);
    }
  }

  // 5. DELETE
  if (CREATED_RECORD_ID) {
    console.log(`5️⃣  DELETE /api/db?id=${CREATED_RECORD_ID} - Удаление записи...`);
    try {
      const deleteRes = await fetch(`${BASE_URL}/api/db?id=${CREATED_RECORD_ID}`, {
        method: 'DELETE',
        headers
      });
      const deleteData = await deleteRes.json();
      console.log(`   Status: ${deleteRes.status}`);
      console.log('   Response:', JSON.stringify(deleteData, null, 2), '\n');
    } catch (e) {
      console.log(`   ❌ Ошибка: ${e.message}\n`);
    }
  }

  console.log('✅ Тестирование завершено!\n');
}

function showCurlExamples() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    ПРИМЕРЫ CURL ЗАПРОСОВ                       ║
╚════════════════════════════════════════════════════════════════╝

📌 Замени YOUR_API_KEY на реальный ключ (mk_...)

# 1. CORS Preflight
curl -X OPTIONS http://localhost:3000/api/db -i

# 2. Создать запись
curl -X POST http://localhost:3000/api/db \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"collection":"todos","data":{"title":"Test","done":false}}'

# 3. Получить записи
curl "http://localhost:3000/api/db?collection=todos" \\
  -H "Authorization: Bearer YOUR_API_KEY"

# 4. Обновить запись
curl -X PUT http://localhost:3000/api/db \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"id":"RECORD_ID","data":{"title":"Updated","done":true}}'

# 5. Удалить запись
curl -X DELETE "http://localhost:3000/api/db?id=RECORD_ID" \\
  -H "Authorization: Bearer YOUR_API_KEY"

═════════════════════════════════════════════════════════════════
`);
}

async function testCorsOptions() {
  console.log('🌐 === ТЕСТ CORS (OPTIONS) ===\n');
  
  try {
    const res = await fetch(`${BASE_URL}/api/db`, { method: 'OPTIONS' });
    console.log(`Status: ${res.status}`);
    console.log('Headers:');
    console.log(`  Access-Control-Allow-Origin: ${res.headers.get('Access-Control-Allow-Origin')}`);
    console.log(`  Access-Control-Allow-Methods: ${res.headers.get('Access-Control-Allow-Methods')}`);
    console.log(`  Access-Control-Allow-Headers: ${res.headers.get('Access-Control-Allow-Headers')}`);
    
    if (res.status === 204 && res.headers.get('Access-Control-Allow-Origin') === '*') {
      console.log('\n✅ CORS настроен правильно!\n');
    } else {
      console.log('\n⚠️  CORS может работать неправильно\n');
    }
  } catch (e) {
    console.log(`❌ Сервер недоступен: ${e.message}`);
    console.log('\n💡 Запусти сервер командой: npm run dev\n');
  }
}

async function testUnauthorized() {
  console.log('🚫 === ТЕСТ БЕЗ АВТОРИЗАЦИИ ===\n');
  
  try {
    const res = await fetch(`${BASE_URL}/api/db?collection=todos`);
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (res.status === 401) {
      console.log('\n✅ Правильно возвращает 401 без авторизации!\n');
    }
  } catch (e) {
    console.log(`❌ Ошибка: ${e.message}\n`);
  }
}

async function testInvalidApiKey() {
  console.log('🔒 === ТЕСТ С НЕВЕРНЫМ API КЛЮЧОМ ===\n');
  
  try {
    const res = await fetch(`${BASE_URL}/api/db?collection=todos`, {
      headers: { 'Authorization': 'Bearer mk_invalid_key_12345' }
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (res.status === 401 && data.error === 'Invalid API key') {
      console.log('\n✅ Правильно отклоняет неверный ключ!\n');
    }
  } catch (e) {
    console.log(`❌ Ошибка: ${e.message}\n`);
  }
}

// Main
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           VIRTUAL BACKEND API - ТЕСТИРОВАНИЕ                   ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  // Проверяем аргументы командной строки
  const args = process.argv.slice(2);
  if (args.includes('--key')) {
    const keyIndex = args.indexOf('--key');
    TEST_API_KEY = args[keyIndex + 1];
    console.log(`\n🔑 Используется API ключ: ${TEST_API_KEY.substring(0, 10)}...`);
  }
  if (args.includes('--project')) {
    const projectIndex = args.indexOf('--project');
    TEST_PROJECT_ID = args[projectIndex + 1];
    console.log(`📁 Project ID: ${TEST_PROJECT_ID}`);
  }
  
  // Запускаем тесты
  await testCorsOptions();
  await testUnauthorized();
  await testInvalidApiKey();
  
  if (TEST_API_KEY) {
    await testWithApiKey();
  } else {
    showCurlExamples();
  }
}

main().catch(console.error);
