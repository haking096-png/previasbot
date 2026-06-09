# Dashboard with custom server for API proxy
FROM node:20-alpine AS builder

WORKDIR /app

# Copy only dashboard files
COPY package*.json ./

RUN npm install

COPY . .

ENV NEXT_PUBLIC_API_URL=https://proud-consideration-production-d69c.up.railway.app

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

# Copy dashboard build artifacts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/server.js ./

EXPOSE 3000

CMD ["node", "server.js"]
