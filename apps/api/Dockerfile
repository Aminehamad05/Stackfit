FROM node:20-alpine
# Prisma engines require OpenSSL (node:alpine ships without it).
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
RUN npm install --workspace apps/api --include-workspace-root
COPY prisma ./prisma
RUN npx prisma generate --schema prisma/schema.prisma
COPY apps/api ./apps/api
COPY scripts ./scripts
COPY db ./db
RUN npm run build --workspace apps/api
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
