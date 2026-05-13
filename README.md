# Telegram Preview Bot

Sistema automatizado de publicação de prévias no Telegram com análise de imagens via Grok AI, agendamento inteligente e dashboard web para gestão completa.

## 📋 Funcionalidades

- ✅ Upload e importação automática de imagens
- ✅ Análise de imagens com Grok AI
- ✅ Geração automática de prévias únicas
- ✅ Dashboard web para gerenciamento
- ✅ Agendamento inteligente de publicações
- ✅ Publicação automática no Telegram
- ✅ Sistema de aprovação de prévias
- ✅ Edição manual de conteúdo
- ✅ Histórico de publicações
- ✅ Configuração de horários personalizados

## 🏗️ Arquitetura

```
telegram-preview-bot/
├── backend/          # API REST + Workers
├── dashboard/        # Interface web (Next.js)
├── uploads/          # Pasta de imagens
└── logs/            # Logs do sistema
```

## 🚀 Instalação

### Pré-requisitos

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Conta no Telegram (Bot Token)
- API Key do Grok (X.AI)

### 1. Clone e instale dependências

```bash
cd telegram-preview-bot
npm install
cd backend && npm install
cd ../dashboard && npm install
cd ..
```

### 2. Configure o banco de dados

```bash
# Crie um banco PostgreSQL
createdb telegram_preview_bot

# Configure a URL no .env
cp .env.example .env
# Edite o .env com suas credenciais
```

### 3. Configure as variáveis de ambiente

Edite o arquivo `.env` na raiz do projeto:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/telegram_preview_bot?schema=public"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379

# Backend
PORT=3001
ADMIN_PASSWORD="sua-senha-segura"

# Telegram
TELEGRAM_BOT_TOKEN="seu-bot-token"
TELEGRAM_CHAT_ID="seu-chat-id"

# Grok API
GROK_API_KEY="sua-api-key"

# App Settings
CTA_LINK="https://t.me/seubot"
```

### 4. Execute as migrations

```bash
npm run prisma:migrate
```

### 5. Inicie o sistema

```bash
# Desenvolvimento (todos os serviços)
npm run dev

# Ou inicie separadamente:
npm run dev:backend    # API na porta 3001
npm run dev:dashboard  # Dashboard na porta 3000
npm run dev:worker     # Workers de processamento
```

## 📱 Como Usar

### 1. Acesse o Dashboard

Abra http://localhost:3000 no navegador

**Login padrão:**
- Usuário: `admin`
- Senha: `admin123` (ou a que você configurou no .env)

### 2. Configure o Sistema

Vá em **Configurações** e preencha:
- Token do Bot do Telegram
- Chat ID do canal/grupo
- API Key do Grok
- Link de CTA
- Horários de publicação

### 3. Adicione Imagens

Coloque suas imagens na pasta `uploads/` com nomes numerados:

```
uploads/
  1.jpg
  2.jpg
  3.jpg
  4.jpg
```

### 4. Importe as Imagens

No dashboard, clique em **Importar Novas Imagens**

### 5. Aguarde o Processamento

O sistema irá automaticamente:
1. Detectar as novas imagens
2. Analisar cada imagem com Grok
3. Gerar prévias únicas
4. Aguardar sua aprovação

### 6. Revise e Aprove

Vá em **Prévias** para:
- Visualizar as prévias geradas
- Editar o conteúdo se necessário
- Aprovar ou rejeitar
- Regenerar se não gostar

### 7. Agendamento Automático

Após aprovação, o sistema agenda automaticamente nos horários configurados.

## 🔧 Configuração do Telegram

### Criar um Bot

1. Fale com [@BotFather](https://t.me/botfather) no Telegram
2. Use o comando `/newbot`
3. Siga as instruções
4. Copie o token fornecido

### Obter o Chat ID

**Para canal:**
1. Adicione o bot como administrador do canal
2. Envie uma mensagem no canal
3. Acesse: `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Procure por `"chat":{"id":-100...}`

**Para grupo:**
1. Adicione o bot ao grupo
2. Envie `/start` no grupo
3. Use o mesmo método acima

## 🤖 Como Funciona

### Fluxo de Processamento

```
1. Upload de Imagens
   ↓
2. Importação (Worker)
   ↓
3. Análise com Grok (Worker)
   ↓
4. Geração de Prévia (Worker)
   ↓
5. Aprovação Manual (Dashboard)
   ↓
6. Agendamento Automático (Worker)
   ↓
7. Publicação no Telegram (Worker)
```

### Workers Ativos

- **Import Worker**: Verifica pasta uploads a cada 5 minutos
- **Analyze Worker**: Analisa imagens com Grok
- **Generate Worker**: Gera prévias baseadas na análise
- **Publish Worker**: Publica no Telegram no horário agendado
- **Schedule Worker**: Agenda posts automaticamente a cada 10 minutos

## 📊 Estrutura das Prévias

Cada prévia gerada segue esta estrutura:

```
[HEADLINE]
✨ Novidade exclusiva

[CORPO]
Descrição baseada na análise da imagem
Elementos visuais identificados
Sensação e emoção transmitida

[PRÉ-CTA]
Quer ver mais?

[CTA]
Clique agora e descubra

[BOTÃO]
VER AGORA → https://t.me/seubot
```

## 🎨 Personalização

### Modificar Templates de Prévia

Edite `backend/src/services/preview.service.ts`:

```typescript
const headlines = [
  '✨ Novidade exclusiva',
  '🔥 Imperdível',
  // Adicione mais opções
];
```

### Ajustar Análise do Grok

Edite `backend/src/services/grok.service.ts` para modificar o prompt de análise.

### Customizar Interface

O dashboard usa Tailwind CSS. Edite os componentes em `dashboard/src/app/dashboard/`.

## 🔒 Segurança

- Senhas são hasheadas com bcrypt
- JWT para autenticação
- Rate limiting nas APIs
- Validação de inputs com Zod
- CORS configurado
- Helmet.js para headers de segurança

## 📝 Logs

Logs são salvos em:
- `logs/error.log` - Apenas erros
- `logs/combined.log` - Todos os logs

## 🐛 Troubleshooting

### Imagens não são importadas

- Verifique se os nomes são numéricos (1.jpg, 2.jpg)
- Verifique permissões da pasta uploads
- Veja os logs em `logs/combined.log`

### Erro ao analisar com Grok

- Verifique se a API Key está correta
- Confirme que tem créditos na conta X.AI
- Veja os logs para detalhes do erro

### Telegram não publica

- Teste a conexão em Configurações
- Verifique se o bot é admin do canal
- Confirme que o Chat ID está correto

### Workers não processam

- Verifique se o Redis está rodando
- Confirme que o worker está ativo
- Veja os logs do worker

## 🚀 Produção

### Usando PM2

```bash
# Instale o PM2
npm install -g pm2

# Inicie os serviços
pm2 start npm --name "backend" -- run start:backend
pm2 start npm --name "worker" -- run start:worker
pm2 start npm --name "dashboard" -- run start

# Salve a configuração
pm2 save
pm2 startup
```

### Usando Docker (opcional)

```bash
# Build
docker-compose build

# Start
docker-compose up -d
```

## 📦 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev                 # Todos os serviços
npm run dev:backend        # Apenas backend
npm run dev:dashboard      # Apenas dashboard
npm run dev:worker         # Apenas workers

# Produção
npm run build              # Build de tudo
npm run start              # Start backend
npm run start:worker       # Start workers

# Banco de dados
npm run prisma:generate    # Gerar Prisma Client
npm run prisma:migrate     # Executar migrations
npm run prisma:studio      # Abrir Prisma Studio
```

## 🤝 Suporte

Para problemas ou dúvidas:
1. Verifique os logs em `logs/`
2. Consulte a documentação do Telegram Bot API
3. Verifique a documentação do Grok API

## 📄 Licença

MIT License - use livremente para seus projetos!

## 🎯 Roadmap

- [ ] Suporte a múltiplos canais
- [ ] Agendamento manual por imagem
- [ ] Estatísticas de engajamento
- [ ] Integração com S3 para uploads
- [ ] Suporte a vídeos
- [ ] API pública
- [ ] Webhooks para eventos

---

Desenvolvido com ❤️ para automatizar suas prévias no Telegram
