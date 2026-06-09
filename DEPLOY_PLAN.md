# DEPLOY PLAN - Telegram Preview Bot to Railway

## 1. ANÁLISE INICIAL

### Estrutura do Projeto
- Backend: Express.js + TypeScript + Workers (BullMQ)
- Frontend: Next.js 14 (App Router)
- Banco: PostgreSQL + Prisma ORM
- Workers: BullMQ para processamento assíncrono
- IA: Grok API (X.AI)
- Telegram: Telegraf

### Serviços Necessários no Railway
1. **backend** - API + Workers
2. **dashboard** - Next.js web app
3. **postgres** - Railway Postgres
4. **redis** - Para BullMQ (opcional, Railway tem Redis)

### Variáveis de Ambiente Necessárias
```
# Database
DATABASE_URL
DIRECT_URL

# Backend
PORT
NODE_ENV
JWT_SECRET
ADMIN_PASSWORD
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
GROK_API_KEY
GROK_API_URL
CTA_LINK
UPLOADS_PATH
LOG_PATH
MAX_FILE_SIZE

# Dashboard
NEXT_PUBLIC_API_URL
```

## 2. PLANO DE DEPLOY

### Passo 1: Preparação Local
- [ ] Verificar .gitignore
- [ ] Remover URLs/DOMÍNIOS Railway antigos
- [ ] Criar backup de .env.local
- [ ] Padronizar variáveis de ambiente
- [ ] Testar build local

### Passo 2: Criar Projeto Railway
- [ ] Criar novo projeto: telegram-preview-bot-production
- [ ] Criar serviços: backend, dashboard, postgres
- [ ] Configurar variáveis de ambiente
- [ ] Configurar domínios (opcional)

### Passo 3: Backend
- [ ] Verificar health check
- [ ] Corrigir CORS
- [ ] Testar rotas principais
- [ ] Configurar workers
- [ ] Deploy backend

### Passo 4: Dashboard
- [ ] Configurar NEXT_PUBLIC_API_URL
- [ ] Testar build
- [ ] Deploy dashboard

### Passo 5: Banco de Dados
- [ ] Criar serviço PostgreSQL
- [ Rodar migrations
- [ ] Validar tabelas

### Passo 6: Testes
- [ ] Health check backend
- [ ] Dashboard HTTP 200
- [ ] Rotas API
- [ ] Telegram API
- [ ] Teste E2E

### Passo 7: Validação Final
- [ ] Logs Railway
- [ ] Testes de produção
- [ ] Relatório final

## 3. CONFIGURAÇÕES ESPECÍFICAS

### Backend Railway
```json
{
  "buildCommand": "cd backend && npm install && npm run build",
  "startCommand": "cd backend && npm start",
  "envVars": {
    "PORT": "3001",
    "NODE_ENV": "production"
  }
}
```

### Dashboard Railway
```json
{
  "buildCommand": "cd dashboard && npm install && npm run build",
  "startCommand": "cd dashboard && npm start",
  "envVars": {
    "NODE_ENV": "production"
  }
}
```

### Workers
Os workers rodam junto com o backend no mesmo processo.

## 4. VERIFICAÇÕES CRÍTICAS

1. **Health Check** - Backend deve responder /health
2. **CORS** - Dashboard deve acessar backend
3. **Database URL** - Variável correta no Railway
4. **Telegram Bot** - Token válido
5. **Grok API** - Chave válida
6. **Redis** - Para BullMQ
7. **Prisma** - Migrations rodadas

## 5. SCRIPTS DE TESTE

Criar scripts para:
- Testar health check
- Testar rotas API
- Testar dashboard
- Testar Telegram
- Testar banco

## 6. ERROS COMUNS CORRIGIR

- CORS: configurar no Express
- Health check: implementar /health
- Database: migrar antes de start
- Workers: garantir que rodam
- Build: verificar dependências
- Port: Railway usa porta dinâmica

## 7. COMANDOS ÚTEIS

```bash
# Verificar logs
railway logs --service backend
railway logs --service dashboard

# Rodar migration
npx prisma migrate deploy

# Gerar Prisma
npx prisma generate

# Testar API
curl https://backend.railway.app/health

# Testar dashboard
curl -I https://dashboard.railway.app
```

## 8. CHECKLIST FINAL

[ ] Backend online
[ ] Dashboard online
[ ] Banco conectado
[ ] Migrations aplicadas
[ ] Health check 200
[ ] Build sem erro
[ ] Logs limpos
[ ] Testes passando
[ ] Dashboard acessível
[ ] API funcional

## 9. DEPENDÊNCIAS EXTERNAS

- Token do Telegram Bot
- Chat ID do canal
- Chave da API Grok (X.AI)
- Link do CTA

## 10. MENSAGEM PARA USUÁRIO

"Projeto deployado com sucesso! Para funcionar completamente, configure:"
1. Token do Telegram Bot
2. Chat ID do canal
3. Chave da API Grok
4. Link do CTA

Sem estas configurações, o sistema estará online mas não poderá postar no Telegram.