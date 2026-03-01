FROM node:20-alpine AS base

# 1. Устанавливаем OpenSSL и libc6 (КРИТИЧНО ДЛЯ PRISMA)
RUN apk add --no-cache libc6-compat openssl

FROM base AS deps
WORKDIR /app

# Копируем файлы зависимостей
COPY package.json package-lock.json* ./

# Устанавливаем зависимости
RUN npm install --legacy-peer-deps

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

# Копируем Prisma схему ПЕРЕД генерацией клиента
COPY prisma ./prisma

# 2. Генерируем Prisma Client (чтобы он был в сборке)
RUN npx prisma generate

# Теперь копируем остальные файлы
COPY . .

# Отключаем телеметрию и сетевой запрос шрифтов на время сборки
ENV NEXT_TELEMETRY_DISABLED 1
ENV NEXT_FONT_GOOGLE_MOCKED 1

# Собираем приложение
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Создаем пользователя (безопасность)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем статику
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 3. Копируем папку Prisma (чтобы работали миграции на сервере)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Копируем node_modules с Prisma client для миграций
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Копируем само приложение (standalone режим)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Копируем скрипт запуска
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Запускаем через entrypoint, который применит миграции
CMD ["./docker-entrypoint.sh"]