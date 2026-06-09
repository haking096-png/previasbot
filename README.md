# Telegram Preview Bot

![Status](https://img.shields.io/badge/status-stable-brightgreen) ![Backend](https://img.shields.io/badge/backend-Node.js%2020+-blue) ![Dashboard](https://img.shields.io/badge/dashboard-Next.js%2014-black)

[![Deploy with Vercel](https://img.shields.io/badge/Vercel-Deploy-black?style=flat-square&logo=vercel)](https://vercel.com/new/clone?repository-url=https://github.com/piuzera/telegram-preview-bot&root-directory=dashboard)
[![Deploy with Railway](https://img.shields.io/badge/Railway-Deploy-black?style=flat-square&logo=railway)](https://railway.app/new?template=https://github.com/piuzera/telegram-preview-bot&root-directory=backend)

Sistema automatizado de publicação de prévias no Telegram com análise de imagens via Grok AI, agendamento inteligente e dashboard web dark-mode premium para gestão completa.

## ✨ Funcionalidades

### 📤 Imagens
- ✅ Upload com drag-and-drop (múltiplas de uma vez)
- ✅ Análise automática com Grok AI (cenário, pose, roupa, emoção)
- ✅ Geração automática de prévias no estilo do canal
- ✅ Preview antes de enviar
- ✅ Barra de progresso por arquivo
- ✅ Validação de tipo e tamanho
- ✅ Imagens já postadas somem automaticamente da lista

### 📝 Copys (Prévias)
- ✅ **Prompt Mestre** configurável por canal
- ✅ **Prompt especializado para Victoria** (loira, safada, Petrobras) — detectado automaticamente pelo nome do canal
- ✅ Geração no formato exato:
  - Headline em CAIXA ALTA com ? (pergunta)
  - Body com 4 frases separadas por \n
  - 3 CTAs idênticos viram links clicáveis
- ✅ Validação automática: força 3 CTAs idênticos, garante ? na headline, divide body em linhas

### 📅 Agendamento
- ✅ Múltiplos horários por canal
- ✅ Agendamento automático após aprovação
- ✅ Auto-retry com backoff exponencial
- ✅ Auto-recuperação de posts travados

### 🤖 Telegram
- ✅ Publicação de foto + legenda
- ✅ Publicação de vídeo + legenda
- ✅ CTA Presente automático
- ✅ Enquetes automáticas
- ✅ Re-upload automático se file_id expirar
- ✅ Detecção e marcação de chat inválido

### 🎨 Dashboard
- ✅ Dark mode premium (Linear/Vercel style)
- ✅ Layout limpo e funcional
- ✅ CRUD completo de canais
- ✅ Desativar/Excluir canais
- ✅ Health check do sistema
- ✅ Logs estruturados
- ✅ Filtros e busca

## 🏗️ Arquitetura

```
telegram-preview-bot/
├── backend/          # API REST + BullMQ Workers
│   ├── src/
│   │   ├── controllers/   # 12 controllers
│   │   ├── services/      # Telegram, Grok, Preview
│   │   ├── workers/       # Analyze, Generate, Publish
│   │   ├── routes/        # Health, etc
│   │   ├── utils/         # Prisma, Logger, CircuitBreaker
│   │   ├── config/        # Validação de env
│   │   └── types/         # TypeScript types
│   └── prisma/            # Schema + migrations
│
├── dashboard/        # Next.js 14 (dark mode)
│   ├── src/
│   │   ├── app/           # Pages (App Router)
│   │   ├── components/    # UI reutilizáveis
│   │   ├── lib/           # API client, state
│   │   └── types/         # TypeScript types
│   └── public/
│
├── uploads/          # Imagens locais (legado)
├── logs/            # Logs estruturados
└── docs/            # Documentação adicional
```

## 🚀 Quick Start

### Pré-requisitos

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Conta no Telegram (Bot Token via @BotFather)
- API Key do Grok (X.AI)

### Instalação Local

```bash
# 1. Instalar dependências
cd telegram-preview-bot
npm install
cd backend && npm install
cd ../dashboard && npm install
cd ..

# 2. Configurar .env
cp .env.example .env
# Editar .env com suas credenciais

# 3. Rodar migrations
cd backend && npx prisma migrate deploy

# 4. Iniciar tudo
cd .. && npm run dev
```

Acessar:
- **Dashboard:** http://localhost:3000
- **API:** http://localhost:3001
- **Login padrão:** admin / admin123

## 📚 Documentação

- **[DEPLOY.md](DEPLOY.md)** — Guia completo de deploy (Vercel + Railway + Neon + Upstash)
- **[PROMPT_MESTRE_VICTORIA.md](PROMPT_MESTRE_VICTORIA.md)** — Prompt especializado do canal Victoria
- **[PROMPT_MESTRE.md](PROMPT_MESTRE.md)** — Prompt genérico (fallback)
- **[CHECKLIST.md](CHECKLIST.md)** — Checklist de deploy
- **[docs/](docs/)** — Documentação técnica

## 🛠️ Stack Técnica

### Backend
- **Node.js 20+** + **TypeScript 5.6**
- **Express 4.19** + **Helmet** + **CORS**
- **Prisma 5.20** + **PostgreSQL 15**
- **BullMQ 5.13** + **Redis 7** (filas + workers)
- **Telegraf 4.16** (cliente Telegram)
- **Winston 3.14** (logging estruturado)
- **Axios** + **Circuit Breaker** (chamadas Grok/X.AI)

### Dashboard
- **Next.js 14** (App Router)
- **TypeScript 5.6**
- **Tailwind CSS 3**
- **React Hot Toast** (notificações)
- **Axios** (com retry interceptor)

### Workers (BullMQ)
- **analyze.worker.ts** — Analisa imagem com Grok
- **generate.worker.ts** — Gera copy a partir da análise
- **publish.worker.ts** — Publica no Telegram
- **schedule.worker.ts** — Agenda posts automaticamente
- **ctaPresente.worker.ts** — CTA Presente programado
- **enquete.worker.ts** — Enquetes programadas
- **import.worker.ts** — (no-op, legado)

## 🔧 Scripts Úteis

```bash
# Desenvolvimento
npm run dev                 # Todos os serviços
npm run dev:backend        # Só backend
npm run dev:dashboard      # Só dashboard
npm run dev:worker         # Só workers

# Produção
npm run build              # Build de tudo
npm run start              # Inicia backend
npm run start:worker       # Inicia workers

# Banco
npm run prisma:generate    # Gerar Prisma Client
npm run prisma:migrate     # Criar/aplicar migrations

# Testes (em desenvolvimento)
cd backend && npm test
```

## 🌐 Deploy em Produção

Veja **[DEPLOY.md](DEPLOY.md)** para o guia completo.

**Custo estimado:** $5-10/mês
- Vercel (dashboard): grátis
- Railway (backend): $5
- Neon (Postgres): grátis até 0.5GB
- Upstash (Redis): grátis até 10k req/dia

## 📊 Custos & Limites

- **Grok/X.AI:** depende do plano (ver https://console.x.ai)
- **Telegram:** grátis (Bot API)
- **Imagens:** armazenadas no Telegram (sem limite prático)

## 🔒 Segurança

- Senhas hasheadas com bcrypt
- JWT para autenticação
- Helmet.js para headers HTTP
- CORS configurado
- Rate limiting nas APIs
- Validação de inputs com Zod
- Tokens nunca expostos no frontend

## 📝 Licença

MIT

## 🤝 Suporte

Para problemas:
1. Verifique os logs em `logs/`
2. Acesse `http://localhost:3000/system` (Health Check)
3. Consulte `docs/BUG_REPORT.md`

---

Desenvolvido para automatizar publicações no Telegram com qualidade.
