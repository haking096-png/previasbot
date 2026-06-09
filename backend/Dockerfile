# ============================================
# Stage 1: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache openssl

# Copiar apenas package files primeiro (para cache de layers)
COPY package*.json ./
RUN npm ci --only=production=false

# Copiar Prisma schema
COPY prisma ./prisma
RUN npx prisma generate

# Copiar código fonte e buildar
COPY . .
RUN npm run build

# ============================================
# Stage 2: Production (non-root)
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Instalar dependências do sistema (sem cache)
RUN apk add --no-cache openssl dumb-init

# Copiar artefatos do builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# Copiar dashboard build
COPY --from=builder --chown=nodejs:nodejs /app/dashboard ./dashboard

# Criar pasta de uploads com permissões corretas
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app

# Trocar para usuário não-root
USER nodejs

# Expor porta
EXPOSE ${PORT:-8080}

# Usar dumb-init para tratar sinais corretamente
ENTRYPOINT ["dumb-init", "--"]

# Migrar banco e iniciar aplicação
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
