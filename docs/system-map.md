# System Map — Telegram Preview Bot v2

## 1. Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TELEGRAM PREVIEW BOT v2                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │ Dashboard  │────▶│   Backend    │────▶│  PostgreSQL  │                │
│  │  (Next.js)  │◀────│  (Express)  │◀────│   (Prisma)   │                │
│  │  Port: 3000 │ │  Port: 3001 │     │              │                │
│  └──────────────┘     └──────┬───────┘     └──────────────┘                │
│                             │                                               │
│                    ┌────────┴────────┐ │
│                    ▼                 ▼                                      │
│              ┌──────────┐     ┌──────────┐                                  │
│              │  Redis   │     │ Workers │                                  │
│              │ (BullMQ) │     │ (BullMQ) │                                  │
│              └──────────┘     └──────────┘                                  │
│                                  │                                          │
│                    ┌─────────────┼─────────────┐                           │
│                    ▼             ▼             ▼                           │
│              ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│              │  Grok    │ │Telegram  │ │  File    │                       │
│              │   API    │ │ API    │ │  System  │                       │
│              └──────────┘ └──────────┘ └──────────┘                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. Frontend (Dashboard Next.js)

### Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **State**: Zustand (store.ts)
- **HTTP Client**: Axios com retry interceptor
- **Notifications**: react-hot-toast

### Estrutura de Diretórios
```
dashboard/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── page.tsx          # Dashboard principal
│   │   │   ├── channels/ # Gerenciamento de canais
│   │   │   ├── media/             # Upload e gestão de imagens
│   │   │   ├── cta-presente/      # Templates e horários CTA
│   │   │   ├── enquetes/          # Templates e horários enquetes
│   │   │   ├── posts/             # Posts agendados
│   │   │   ├── templates/         # Templates customizados
│   │   │   ├── settings/          # Configurações
│   │   │   └── analytics/         # Analytics
│   │   ├── login/                # Página de login
│   │   └── layout.tsx            # Layout principal
│   ├── components/
│   │   ├── ui/                   # Componentes UI reutilizáveis
│   │   ├── layout/               # Layout components (sidebar)
│   │   ├── ChannelSelector.tsx
│   │   ├── CustomPreviewEditor.tsx
│   │   └── VideoPreviewCreator.tsx
│   ├── lib/
│   │   ├── api.ts                # Cliente API Axios
│   │   └── store.ts              # Zustand store
│   └── types/
│       └── index.ts               # Definições de tipos
└── public/
```

### Páginas Principais
| Página | Descrição |
|--------|-----------|
| `/` | Login |
| `/dashboard` | Visão geral com stats |
| `/dashboard/channels` | CRUD de canais Telegram |
| `/dashboard/media` | Upload e gestão de imagens |
| `/dashboard/cta-presente` | Templates e horários CTA |
| `/dashboard/enquetes` | Templates e horários enquetes |
| `/dashboard/posts` | Posts agendados/publicados |
| `/dashboard/templates` | Templates customizados |
| `/dashboard/settings` | Configurações globais |

## 3. Backend (Express + TypeScript)

### Stack
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **ORM**: Prisma
- **Queue**: BullMQ + IORedis
- **Bot**: Telegraf
- **AI**: Grok API (X.AI)
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting

### Estrutura de Diretórios
```
backend/
├── src/
│   ├── index.ts                  # Entry point Express
│   ├── config/
│   │   └── index.ts              # Configurações do app
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── channel.controller.ts
│   │   ├── ctaPresente.controller.ts
│   │   ├── enquete.controller.ts
│   │   ├── logs.controller.ts
│   │   ├── media.controller.ts
│   │   ├── post.controller.ts
│   │   ├── preview.controller.ts
│   │   ├── schedule.controller.ts
│   │   ├── settings.controller.ts
│   │   ├── template.controller.ts
│   │   └── video.controller.ts
│   ├── middleware/
│   │   ├── auth.ts               # JWT auth middleware
│   │   └── errorHandler.ts       # Global error handler
│   ├── services/
│   │   ├── ctaEnquete.service.ts
│   │   ├── grok.service.ts       # Grok AI integration
│   │   ├── preview.service.ts
│   │   └── telegram.service.ts   # Telegram Bot API
│   ├── types/
│   │   ├── config.ts
│   │   └── dto.ts
│   ├── utils/
│   │   ├── censor.ts             # Censura de palavras
│   │   ├── logger.ts             # Winston logger
│   │   ├── prisma.ts             # Prisma client
│   │   └── queue.ts              # BullMQ queues
│   ├── workers/
│   │   ├── index.ts              # Worker entry point
│   │   ├── analyze.worker.ts     # Análise de imagem Grok
│   │   ├── ctaPresente.worker.ts # Worker CTA automático
│   │   ├── enquete.worker.ts    # Worker enquete automático
│   │   ├── generate.worker.ts   # Geração de prévias
│   │   ├── import.worker.ts     # Importação de imagens
│   │   ├── publish.worker.ts    # Publicação Telegram
│   │   └── schedule.worker.ts    # Agendamento
│   └── prisma/
│       └── schema.prisma         # Schema do banco
└── uploads/                      # Pasta de uploads
```

### APIs REST

#### Autenticação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/change-password` | Alterar senha |

#### Configurações
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/settings` | Listar todas |
| GET | `/api/settings/:key` | Buscar por chave |
| PUT | `/api/settings/:key` | Atualizar |
| POST | `/api/settings/test-telegram` | Testar Telegram |

#### Mídia
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/media` | Listar mídias |
| GET | `/api/media/:id` | Buscar por ID |
| GET | `/api/media/:id/image` | Proxy imagem Telegram |
| POST | `/api/media/upload` | Upload (multipart) |
| POST | `/api/media/:id/reprocess` | Reprocessar |
| POST | `/api/media/reorder` | Reordenar |
| DELETE | `/api/media/:id` | Deletar |
| POST | `/api/media/import` | Trigger import |

#### Prévias
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/previews` | Listar prévias |
| GET | `/api/previews/:id` | Buscar por ID |
| PUT | `/api/previews/:id` | Atualizar |
| POST | `/api/previews/:id/approve` | Aprovar |
| POST | `/api/previews/:id/reject` | Rejeitar |
| POST | `/api/previews/:id/regenerate` | Regenerar |
| POST | `/api/previews/test` | Testar prompt |
| POST | `/api/previews/from-video` | Gerar de vídeo |

#### Posts
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/posts` | Listar posts |
| GET | `/api/posts/:id` | Buscar por ID |
| POST | `/api/posts/schedule` | Agendar |
| POST | `/api/posts/:id/publish-now` | Publicar agora |
| POST | `/api/posts/:id/cancel` | Cancelar |
| POST | `/api/posts/:id/reschedule` | Reagendar |
| DELETE | `/api/posts/:id` | Deletar |
| POST | `/api/posts/reorder` | Reordenar |
| POST | `/api/posts/bulk-delete` | Bulk delete |
| POST | `/api/posts/:id/regenerate` | Regenerar prévia |

#### Canais
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/channels` | Listar canais |
| GET | `/api/channels/:id` | Buscar por ID |
| POST | `/api/channels` | Criar |
| PUT | `/api/channels/:id` | Atualizar |
| DELETE | `/api/channels/:id` | Deletar |
| POST | `/api/channels/:id/test` | Testar conexão |

#### CTA Presente
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/cta-presente-schedules` | Listar horários |
| POST | `/api/cta-presente-schedules` | Criar horário |
| DELETE | `/api/cta-presente-schedules/:id` | Deletar |
| POST | `/api/cta-presente/test` | Postar agora |

#### Enquetes
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/enquete-schedules` | Listar horários |
| POST | `/api/enquete-schedules` | Criar horário |
| DELETE | `/api/enquete-schedules/:id` | Deletar |
| POST | `/api/enquete/test` | Postar agora |

#### Templates
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/templates` | Listar templates |
| POST | `/api/templates` | Criar |
| PUT | `/api/templates/:id` | Atualizar |
| DELETE | `/api/templates/:id` | Deletar |
| POST | `/api/templates/reorder` | Reordenar |
| POST | `/api/templates/generate` | Gerar do template |

## 4. Banco de Dados (PostgreSQL + Prisma)

### Schema

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Channel   │────▶│  Template  │     │   User │
│             │     │            │     │             │
│ - id        │     │ - id       │     │ - id        │
│ - name      │     │ - channelId│ │ - username  │
│ - botToken  │     │ - type     │     │ - password  │
│ - chatId    │     │ - name     │     │             │
│ - ctaLink   │     │ - data     │     └─────────────┘
│ - prompts   │     │ - order    │
│ - enabled   │     │ - isActive │
└──────┬──────┘     └─────────────┘
 │
       │1:N
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  MediaItem  │────▶│MediaAnalysis│     │  Settings │
│             │     │            │     │             │
│ - id        │     │ - id       │     │ - id        │
│ - filename  │     │ - scenario │     │ - key       │
│ - telegramId│     │ - emotion  │     │ - value     │
│ - mediaType │     │ - copy     │     │             │
│ - status    │     │ - etc...   │     └─────────────┘
│ - order     │     │            │
└──────┬──────┘     └─────────────┘
       │
       │ 1:1
       ▼
┌─────────────┐     ┌─────────────┐
│   Preview   │────▶│    Post     │
│             │     │             │
│ - id        │     │ - id        │
│ - headline  │     │ - channelId  │
│ - body      │     │ - scheduleId │
│ - preCta    │     │ - scheduledFor│
│ - cta       │     │ - publishedAt│
│ - buttonUrl │     │ - status    │
│ - approved  │     │ - error     │
└─────────────┘     └─────────────┘
```

### Enums
- **MediaStatus**: PENDING, ANALYZING, ANALYZED, GENERATING_PREVIEW, READY, ERROR
- **PreviewStatus**: PENDING, APPROVED, REJECTED
- **PostStatus**: SCHEDULED, PUBLISHING, PUBLISHED, FAILED, CANCELLED

## 5. Workers (BullMQ)

### Filas
| Fila | Concorrência | Descrição |
|------|-------------|-----------|
| import | 1 | Importa imagens da pasta uploads |
| analyze | 2 | Analisa imagens com Grok |
| generate | 1 | Gera prévias |
| publish | 1 | Publica no Telegram |
| schedule | 1 | Agenda posts automaticamente |

### Jobs Recorrentes
- **import-media**: A cada 5 minutos
- **schedule-posts**: A cada 2 minutos

### Workers Contínuos
- **ctaPresente.worker**: A cada 60s verifica horários CTA
- **enquete.worker**: A cada 60s verifica horários enquetes

## 6. Integrações Externas

### Telegram Bot API
- **Envio de fotos/vídeos**: `sendPhoto`, `sendVideo`
- **Enquetes**: `sendPoll`
- **Mensagens**: `sendMessage` (CTA)
- **Arquivos**: `getFileLink`, `deleteMessage`

### Grok AI (X.AI)
- **Modelo padrão**: `grok-4-1-fast-non-reasoning`
- **Análise de imagem**: Vision API com base64
- **Geração de texto**: Chat Completions API
- **Retry**: Exponential backoff (3 tentativas)

### Redis (BullMQ)
- **Connection**: IORedis com retry
- **Queues**: import, analyze, generate, publish, schedule

## 7. Deploy (Railway)

### Serviços
1. **Backend**: API + Workers (porta 3001)
2. **Dashboard**: Next.js (porta 3000)
3. **Worker**: Processamento em background

### Variáveis de Ambiente
```env
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_HOST=...
REDIS_PORT=6379
REDIS_PASSWORD=...

# Backend
PORT=3001
NODE_ENV=production
JWT_SECRET=...
ADMIN_PASSWORD=...

# Telegram
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...

# Grok
GROK_API_KEY=...
GROK_API_URL=https://api.x.ai/v1

# App
CTA_LINK=...
UPLOADS_PATH=./uploads
LOG_PATH=./logs
MAX_FILE_SIZE=10485760

# Service Type
SERVICE_TYPE=backend|dashboard|worker
```

### Dockerfiles
- **Dockerfile**: Backend principal
- **Dockerfile.worker**: Workers de processamento

## 8. Fluxo de Processamento

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUXO COMPLETO                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. UPLOAD                                                              │
│     Dashboard ──▶ Upload ──▶ Telegram Storage ──▶ Prisma (MediaItem)   │
│                                                                         │
│  2. ANÁLISE (Worker)                                                    │
│     MediaItem(PENDING) ──▶ Grok Vision ──▶ MediaAnalysis ──▶ READY      │
│                                                                         │
│  3. GERAÇÃO (Worker)                                                    │
│     MediaAnalysis ──▶ Grok Chat ──▶ Preview ──▶ PENDING_APPROVAL       │
│                                                                         │
│  4. APROVAÇÃO (Dashboard)                                                │
│     Preview ──▶ Editar ──▶ Approve/Reject ──▶ APPROVED                  │
│                                                                         │
│  5. AGENDAMENTO (Worker)                                                │
│     Preview(APPROVED) ──▶ Schedule ──▶ Post(SCHEDULED)                  │
│                                                                         │
│  6. PUBLICAÇÃO (Worker)                                                 │
│     Post(SCHEDULED) ──▶ Telegram API ──▶ Post(PUBLISHED)                │
│                                                                         │
│7. CTA PRESENTE (Worker contínuo)                                      │
│     Horário ──▶ Grok ──▶ Template ──▶ Telegram ──▶ Log                 │
│                                                                         │
│  8. ENQUETE (Worker contínuo)                                           │
│     Horário ──▶ Grok ──▶ Template ──▶ Telegram Poll ──▶ Log            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 9. Segurança

- **Senhas**: bcrypt hashing
- **Auth**: JWT tokens
- **Rate Limiting**: 500 requests/15min
- **Helmet.js**: Security headers
- **CORS**: Configurado
- **Input Validation**: Zod (implícito via Prisma)
- **Censorship**: Filtro de palavras pesadas

## 10. Observabilidade

### Logs
- **error.log**: Apenas erros
- **combined.log**: Todos os logs
- **Formato**: JSON com timestamp

### Job Logs (Prisma)
- Registra: import, analyze, generate, publish, cta-presente, enquete
- Status: completed, failed
- Dados: JSON com contexto

## 11. URLs e Endpoints

### Desenvolvimento
- Dashboard: http://localhost:3000
- API: http://localhost:3001

### Produção (Railway)
- Dashboard: https://telegram-bot-v2.up.railway.app
- API: https://telegram-bot-v2.railway.app

---

*Última atualização: 2026-06-06*
