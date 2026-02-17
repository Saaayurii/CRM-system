# ============================================
# Multi-stage Dockerfile для NestJS сервисов
# ============================================

# === STAGE 1: Dependencies ===
FROM node:20-alpine AS dependencies

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем только production зависимости
RUN npm ci --only=production && npm cache clean --force

# === STAGE 2: Build ===
FROM node:20-alpine AS build

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем все зависимости (включая dev)
RUN npm ci

# Копируем исходники
COPY . .

# Генерируем Prisma Client (если есть)
RUN if [ -f prisma/schema.prisma ]; then node_modules/.bin/prisma generate; fi

# Собираем приложение
RUN npm run build
# === STAGE 3: Production ===
FROM node:20-alpine AS production

# Устанавливаем wget для healthcheck
RUN apk add --no-cache wget

WORKDIR /app

# Копируем node_modules из dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Копируем собранное приложение
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# Копируем Prisma файлы (если есть)
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Создаем пользователя без root прав
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Создаем директорию для логов
RUN mkdir -p /app/logs && chown -R nestjs:nodejs /app/logs

# Переключаемся на пользователя
USER nestjs

# Exposing port (будет переопределен в docker-compose)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --spider -q http://localhost:3000/health || exit 1

# Запуск приложения
CMD ["node", "dist/main"]
