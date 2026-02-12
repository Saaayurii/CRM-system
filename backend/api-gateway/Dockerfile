# ============================================
# Multi-stage Dockerfile для API Gateway
# ============================================

# === STAGE 1: Dependencies ===
FROM node:20-alpine AS dependencies

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

# === STAGE 2: Build ===
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# === STAGE 3: Production ===
FROM node:20-alpine AS production

RUN apk add --no-cache wget

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules

COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

RUN mkdir -p /app/logs && chown -R nestjs:nodejs /app/logs

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --spider -q http://localhost:3000/health || exit 1

CMD ["node", "dist/main"]
