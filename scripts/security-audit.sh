#!/bin/bash
# ===========================================
# СКРИПТ АУДИТА БЕЗОПАСНОСТИ
# Запустить на сервере ПЕРЕД любыми изменениями!
# ===========================================

echo "🔍 АУДИТ БЕЗОПАСНОСТИ MOONELY"
echo "=============================="
echo "Дата: $(date)"
echo ""

# Переменные (замените если нужно)
CONTAINER_NAME="moonely-db-1"  # или moonely_db_1
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-moonely}"

# Создаем папку для отчётов
mkdir -p ./security-audit-$(date +%Y%m%d)
AUDIT_DIR="./security-audit-$(date +%Y%m%d)"

echo "📁 Отчёты сохраняются в: $AUDIT_DIR"
echo ""

# ===========================================
# 1. БЭКАП БАЗЫ ДАННЫХ (КРИТИЧНО!)
# ===========================================
echo "💾 [1/7] Создание полного бэкапа базы данных..."
docker exec $CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME > "$AUDIT_DIR/full_backup.sql"
echo "   ✅ Бэкап сохранён: $AUDIT_DIR/full_backup.sql"
echo ""

# ===========================================
# 2. ПРОВЕРКА ПОЛЬЗОВАТЕЛЕЙ POSTGRESQL
# ===========================================
echo "👤 [2/7] Пользователи PostgreSQL (ищем чужих)..."
docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c \
  "SELECT usename, usecreatedb, usesuper, valuntil FROM pg_user;" \
  > "$AUDIT_DIR/pg_users.txt"
cat "$AUDIT_DIR/pg_users.txt"
echo ""

# ===========================================
# 3. СПИСОК ВСЕХ ТАБЛИЦ (ищем чужие)
# ===========================================
echo "📋 [3/7] Список таблиц (ищем подозрительные)..."
docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c \
  "\dt" > "$AUDIT_DIR/tables.txt"
cat "$AUDIT_DIR/tables.txt"
echo ""

# ===========================================
# 4. АКТИВНЫЕ ПОДКЛЮЧЕНИЯ
# ===========================================
echo "🔌 [4/7] Активные подключения к БД..."
docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c \
  "SELECT pid, usename, client_addr, application_name, state, query_start, query 
   FROM pg_stat_activity 
   WHERE datname = '$DB_NAME';" \
  > "$AUDIT_DIR/active_connections.txt"
cat "$AUDIT_DIR/active_connections.txt"
echo ""

# ===========================================
# 5. АУДИТ ПОЛЬЗОВАТЕЛЕЙ ПРИЛОЖЕНИЯ
# ===========================================
echo "👥 [5/7] Пользователи с наибольшими кредитами..."
docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c \
  'SELECT id, email, credits, plan, "createdAt" FROM "User" ORDER BY credits DESC LIMIT 30;' \
  > "$AUDIT_DIR/users_by_credits.txt"
cat "$AUDIT_DIR/users_by_credits.txt"
echo ""

# ===========================================
# 6. АУДИТ ТРАНЗАКЦИЙ
# ===========================================
echo "💰 [6/7] Последние транзакции..."
docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c \
  'SELECT id, "userId", amount, credits, status, "createdAt" 
   FROM "Transaction" 
   ORDER BY "createdAt" DESC LIMIT 30;' \
  > "$AUDIT_DIR/transactions.txt"
cat "$AUDIT_DIR/transactions.txt"
echo ""

# Подозрительные транзакции (без operation_id)
echo "   Подозрительные транзакции (без YooMoney ID)..."
docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c \
  'SELECT * FROM "Transaction" 
   WHERE "operationId" IS NULL AND status = '\''COMPLETED'\'';' \
  > "$AUDIT_DIR/suspicious_transactions.txt"
cat "$AUDIT_DIR/suspicious_transactions.txt"
echo ""

# ===========================================
# 7. ПРОВЕРКА ЛОГОВ DOCKER
# ===========================================
echo "📜 [7/7] Логи контейнера БД (последние 500 строк)..."
docker logs --tail 500 $CONTAINER_NAME > "$AUDIT_DIR/db_logs.txt" 2>&1
echo "   ✅ Логи сохранены: $AUDIT_DIR/db_logs.txt"
echo ""

# ===========================================
# ИТОГИ
# ===========================================
echo "=============================="
echo "✅ АУДИТ ЗАВЕРШЁН"
echo "=============================="
echo ""
echo "📂 Все отчёты в папке: $AUDIT_DIR"
echo ""
echo "🔍 Что проверить вручную:"
echo "   1. pg_users.txt — есть ли пользователи кроме postgres/$DB_USER?"
echo "   2. tables.txt — есть ли таблицы кроме ваших (User, Chat, Transaction...)?"
echo "   3. users_by_credits.txt — кто-то накрутил себе кредиты?"
echo "   4. suspicious_transactions.txt — транзакции без YooMoney подтверждения?"
echo "   5. db_logs.txt — ищите 'COPY', 'FROM PROGRAM', подозрительные IP"
echo ""
echo "⚠️  ПОСЛЕ проверки:"
echo "   1. Смените POSTGRES_PASSWORD в .env"
echo "   2. Обновите docker-compose.yml (127.0.0.1:5433:5432)"
echo "   3. docker-compose down && docker-compose up -d --build"
