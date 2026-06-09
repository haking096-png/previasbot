# Dashboard with custom server for API proxy
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY dashboard/package*.json ./

RUN npm install

# Copy all dashboard files
COPY dashboard/ ./

ENV NEXT_PUBLIC_API_URL=https://proud-consideration-production-d69c.up.railway.app

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

# Copy Next.js build and custom server
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "server.js"]
