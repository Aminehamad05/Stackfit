FROM node:20-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

FROM base AS builder
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY prisma ./prisma/

RUN npm ci

COPY apps/api ./apps/api
COPY tsconfig*.json ./

RUN npx prisma generate 
RUN npm run build --workspace=apps/api || (cd apps/api && npm run build)

FROM base AS prod-deps
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY prisma ./prisma/

RUN npm ci --omit=dev
RUN npx prisma generate

FROM base AS migration

WORKDIR /app
COPY package*.json ./
COPY tsconfig*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY db ./db
COPY scripts ./scripts
USER node

CMD ["sh", "-c","npx prisma migrate deploy && npx tsx scripts/bootstrap.ts"]


FROM base AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/prisma ./prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
USER node
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]