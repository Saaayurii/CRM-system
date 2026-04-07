# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

# Build-time public env vars (baked into JS bundle)
ARG NEXT_PUBLIC_API_URL=/api/v1
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_CHAT_WS_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_CHAT_WS_URL=$NEXT_PUBLIC_CHAT_WS_URL

# Internal URLs used by Next.js server-side rewrites (NOT baked into client bundle)
ARG API_GATEWAY_INTERNAL_URL=http://api-gateway:3000
ARG CHAT_SERVICE_INTERNAL_URL=http://chat-service:3011
ENV API_GATEWAY_INTERNAL_URL=$API_GATEWAY_INTERNAL_URL
ENV CHAT_SERVICE_INTERNAL_URL=$CHAT_SERVICE_INTERNAL_URL

RUN npm run build

# ── Stage 2: Production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3030

RUN apk add --no-cache wget \
 && addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3030

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --spider -q http://localhost:3030 || exit 1

CMD ["node", "server.js"]
