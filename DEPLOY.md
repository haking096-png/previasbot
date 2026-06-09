# Guia de Deploy - Telegram Preview Bot

Sistema automatizado de publicação de prévias no Telegram com análise de imagens via Grok AI, agendamento inteligente e dashboard web.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         TELEGRAM                                │
│                     @YourBot (Canal)                             │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         RAILWAY                                  │
│                    Backend API (Node.js)                        │
│                    - Express REST API │
│                    - BullMQ Workers                             │
│                    - Health Check (/health)                     │
└──────────┬──────────────────┬───────────────────┬──────────────┘
           │                  │                   │
           ▼                  ▼                   ▼
┌──────────────────┐  ┌────────────────┐  ┌────────────────────────┐
│     NEON         │  │    UPSTASH     │  │       VERCEL          │
│   PostgreSQL     │  │     Redis      │  │     Dashboard          │
│   (0.5GB free)  │  │  (10k/day)     │  │     (Next.js)         │
└─────────────────┘  └────────────────┘  └────────────────────────┘
```

## Stack Técnica

| Serviço | Uso | Custo |
|---------|-----|-------|
| Vercel | Dashboard frontend | $0 (Hobby) |
| Railway | Backend API + Workers | ~$5-10/mês |
| Neon | PostgreSQL database | $0 (Free tier) |
| Upstash | Redis cache/queue | $0 (Free tier) |

---

## 1. Neon Postgres (Database)

### Passo a Passo

1. Acesse [neon.tech](https://neon.tech) e crie uma conta
2. Clique em **New Project**
3. Configure:
   - **Project Name:** `telegram-preview-bot`
   - **Region:** `US East 2` (recomendado para menor latência)
 - **Compute Size:** `0.5 GB` (free tier)
4. Clique em **Create Project**
5. Na tela seguinte, copie a **Connection String**:

```
postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Variável de Ambiente

```
DATABASE_URL=postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Schema SQL (gerado automaticamente pelo Prisma)

O Prisma migrations já cria todas as tabelas necessárias:

```sql
-- Tabelas principais:
-- - User (autenticação admin)
-- - Channel (configurações do Telegram)
-- - Image (imagens importadas)
-- - Preview (prévias geradas)
-- - ScheduledPost (posts agendados)
-- - PublishedPost (histórico de publicações)
-- - Settings (configurações globais)
```

---

## 2. Upstash Redis (Cache/Queue)

### Passo a Passo

1. Acesse [upstash.com](https://upstash.com) e crie uma conta
2. Clique em **Create Database**
3. Configure:
   - **Name:** `telegram-preview-bot`
   - **Region:** `US East (Global)` (menor latência)
 - **Tier:** `Free` (10,000 requests/day)
4. Clique em **Create**
5. Na tela do database, copie os valores:
   - **Connection URL:** `rediss://default:xxx@xxx.upstash.io:6379`
   - **Host:** `xxx.upstash.io`
   - **Port:** `6379`
   - **Password:** `xxx`

### Variáveis de Ambiente

```bash
REDIS_URL="rediss://default:xxx@xxx.upstash.io:6379"
REDIS_HOST="xxx.upstash.io"
REDIS_PORT=6379
REDIS_PASSWORD="your-redis-password"
```

---

## 3. Railway (Backend)

### Configuração do Projeto

1. Acesse [railway.app](https://railway.app) e conecte com GitHub
2. Clique em **New Project** → **Deploy from GitHub repo**
3. Selecione o repositório `telegram-preview-bot`
4. Configure o **Root Directory** como `backend`

### Variáveis de Ambiente (Settings → Variables)

```bash
# Database (Neon)
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Redis (Upstash)
REDIS_URL="rediss://default:xxx@xxx.upstash.io:6379"
REDIS_HOST="xxx.upstash.io"
REDIS_PORT=6379
REDIS_PASSWORD="xxx"

# Backend
PORT=8080
NODE_ENV=production
JWT_SECRET="generated-secret-here"
ADMIN_PASSWORD="your-secure-password"

# Telegram
TELEGRAM_BOT_TOKEN="your-bot-token"
TELEGRAM_CHAT_ID="your-channel-id"

# Grok API
GROK_API_KEY="xai-your-key"
GROK_API_URL="https://api.x.ai/v1"

# App
CTA_LINK="https://t.me/yourbot"
UPLOADS_PATH="./uploads"
MAX_FILE_SIZE=10485760
```

### Gerar JWT_SECRET

```bash
openssl rand -hex 32
```

### Deploy

1. Após configurar as variáveis, o Railway fará o deploy automaticamente
2. Aguarde o build (2-5 minutos)
3. Copie a URL do deployment: `https://telegram-preview-bot.up.railway.app`

### Health Check

O backend expõe `/health` para verificação:
```bash
curl https://telegram-preview-bot.up.railway.app/health
```

### Rodar Migrations Manualmente

Se necessário, rode via Railway CLI:
```bash
railway run npx prisma migrate deploy
```

---

## 4. Vercel (Dashboard)

### Configuração do Projeto

1. Acesse [vercel.com](https://vercel.com) e conecte com GitHub
2. Clique em **Add New Project** → **Import Git Repository**
3. Selecione o repositório `telegram-preview-bot`
4. Configure o **Root Directory** como `dashboard`
5. Em **Build Command**, deixe o padrão: `npm run build`
6. Em **Output Directory**, deixe: `.next`

### Variáveis de Ambiente (Settings → Environment Variables)

```bash
NEXT_PUBLIC_API_URL="https://telegram-preview-bot.up.railway.app"
```

**Importante:** Use a URL do Railway (backend) sem barra no final.

### Deploy

1. Clique em **Deploy**
2. Aguarde o build (1-3 minutos)
3. Acesse: `https://telegram-preview-bot.vercel.app`

---

## 5. Configuração Pós-Deploy

### 5.1 Acessar Dashboard

1. Acesse a URL do Vercel Dashboard
2. Login padrão:
   - **Usuário:** `admin`
   - **Senha:** (a que você configurou em `ADMIN_PASSWORD`)

### 5.2 Configurar Telegram Bot

1. No dashboard, vá em **Configurações**
2. Preencha:
   - **Telegram Bot Token:** (do @BotFather)
   - **Chat ID:** (ID do seu canal)
   - **Link CTA:** (link para seu bot)

### 5.3 Criar Primeiro Canal

1. Vá em **Canais** → **Novo Canal**
2. Configure:
   - Nome do canal
   - Horários de publicação
   - Token do bot (se diferente do padrão)

### 5.4 Testar Publicação

1. Adicione imagens na pasta `uploads/` do backend
2. No dashboard, clique em **Importar Imagens**
3. Aguarde o processamento (Grok AI)
4. Aprove as prévias geradas
5. Verifique a publicação no Telegram

---

## 6. Custos Estimados

| Serviço | Plano | Custo Mensal |
|--------|-------|--------------|
| Vercel | Hobby | $0 |
| Railway | Hobby + Sleep | ~$5 |
| Neon | Free (0.5GB) | $0 |
| Upstash | Free (10k/day) | $0 |
| **Total** | | **~$5/mês** |

### Otimização de Custos

- **Railway:** Configure `sleep` para economia (desativa após 30min inatividade)
- **Neon:** Free tier suporta até 0.5GB de dados
- **Upstash:** Free tier é suficiente para ~300 posts/dia

---

## 7. Troubleshooting

### Backend não sobe no Railway

1. Verifique se `DATABASE_URL` está correto
2. Verifique se `REDIS_URL` está correto
3. Check os logs em Railway Dashboard → Deployments

### Dashboard não conecta no Backend

1. Verifique `NEXT_PUBLIC_API_URL` no Vercel
2. Confirme que a URL não tem barra no final
3. Verifique CORS no backend

### Redis connection failed

1. Verifique `REDIS_URL` (formato: `rediss://...`)
2. Confirme que o Upstash está na região US
3. Verifique se o password está correto

### Grok API errors

1. Verifique se `GROK_API_KEY` está correto
2. Confirme que tem créditos na conta X.AI
3. Check rate limits

---

## 8. Links Úteis

- [Neon Docs](https://neon.tech/docs)
- [Upstash Docs](https://docs.upstash.com)
- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [Telegram Bot Father](https://t.me/botfather)
- [X.AI Grok](https://x.ai/api)

---

## 9. Comandos Úteis

### Railway CLI

```bash
# Login
railway login

# Linkar projeto
railway link

# Ver logs
railway logs

# Executar comando
railway run npx prisma migrate deploy

# Abrir shell
railway run sh

# Variáveis
railway variables
```

### Verificar Health

```bash
curl https://telegram-preview-bot.up.railway.app/health
```

### Reiniciar Deployment

```bash
railway redeploy
```

---

Desenvolvido com ❤️ para automatizar suas prévias no Telegram
