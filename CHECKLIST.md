# CHECKLIST DE PRODUÇÃO

## ✅ Pré-Deploy

### Banco de Dados
- [ ] PostgreSQL instalado e rodando
- [ ] Banco de dados criado
- [ ] Migrations executadas (`npm run prisma:migrate`)
- [ ] Backup configurado

### Redis
- [ ] Redis instalado e rodando
- [ ] Senha configurada (se produção)
- [ ] Persistência habilitada

### Variáveis de Ambiente
- [ ] Arquivo `.env` criado
- [ ] `DATABASE_URL` configurada
- [ ] `REDIS_HOST` e `REDIS_PORT` configurados
- [ ] `JWT_SECRET` gerado (use senha forte)
- [ ] `ADMIN_PASSWORD` definido (senha forte)
- [ ] `TELEGRAM_BOT_TOKEN` configurado
- [ ] `TELEGRAM_CHAT_ID` configurado
- [ ] `GROK_API_KEY` configurado
- [ ] `CTA_LINK` configurado
- [ ] `NODE_ENV=production`

### Telegram
- [ ] Bot criado via @BotFather
- [ ] Bot adicionado ao canal/grupo como admin
- [ ] Chat ID obtido e testado
- [ ] Permissões de postagem concedidas

### Grok API
- [ ] Conta criada em x.ai
- [ ] API Key gerada
- [ ] Créditos disponíveis
- [ ] Testado localmente

### Segurança
- [ ] Senhas fortes configuradas
- [ ] JWT_SECRET aleatório e seguro
- [ ] CORS configurado corretamente
- [ ] Rate limiting ativo
- [ ] Helmet.js configurado
- [ ] Logs de erro monitorados

## 🚀 Deploy

### Build
```bash
cd telegram-preview-bot
npm run build
```

### Instalação no Servidor
```bash
# Clone o repositório
git clone <seu-repo>
cd telegram-preview-bot

# Instale dependências
npm install
cd backend && npm install
cd ../dashboard && npm install
cd ..

# Configure .env
cp .env.example .env
nano .env

# Execute migrations
npm run prisma:migrate

# Build
npm run build
```

### PM2 (Recomendado)
```bash
# Instale PM2
npm install -g pm2

# Inicie serviços
pm2 start npm --name "backend" -- run start:backend
pm2 start npm --name "worker" -- run start:worker

# Para o dashboard, use nginx como proxy reverso
# ou sirva com PM2:
cd dashboard
pm2 start npm --name "dashboard" -- start

# Salve configuração
pm2 save
pm2 startup
```

### Nginx (Recomendado para Dashboard)
```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

## 📊 Monitoramento

### Logs
- [ ] Logs configurados em `/logs`
- [ ] Rotação de logs configurada
- [ ] Alertas de erro configurados

### PM2 Monitoring
```bash
pm2 monit
pm2 logs
pm2 status
```

### Health Checks
- [ ] Endpoint `/health` respondendo
- [ ] Backend acessível
- [ ] Dashboard acessível
- [ ] Workers processando

### Testes
- [ ] Login no dashboard funciona
- [ ] Importação de imagens funciona
- [ ] Análise com Grok funciona
- [ ] Geração de prévias funciona
- [ ] Publicação no Telegram funciona
- [ ] Agendamento funciona

## 🔧 Manutenção

### Diário
- [ ] Verificar logs de erro
- [ ] Verificar status dos workers
- [ ] Verificar fila do Redis

### Semanal
- [ ] Backup do banco de dados
- [ ] Limpar logs antigos
- [ ] Verificar uso de disco
- [ ] Verificar créditos Grok API

### Mensal
- [ ] Atualizar dependências
- [ ] Revisar segurança
- [ ] Otimizar banco de dados
- [ ] Revisar performance

## 🐛 Troubleshooting

### Backend não inicia
```bash
# Verifique logs
pm2 logs backend

# Verifique .env
cat .env

# Verifique banco
psql -U user -d telegram_preview_bot -c "SELECT 1"

# Verifique Redis
redis-cli ping
```

### Workers não processam
```bash
# Verifique logs
pm2 logs worker

# Verifique Redis
redis-cli
> KEYS *

# Reinicie workers
pm2 restart worker
```

### Telegram não publica
```bash
# Teste conexão
curl -X POST https://api.telegram.org/bot<TOKEN>/getMe

# Verifique chat ID
curl -X POST https://api.telegram.org/bot<TOKEN>/getUpdates

# Verifique logs
pm2 logs worker | grep telegram
```

## 📈 Otimizações

### Performance
- [ ] Índices no banco de dados
- [ ] Cache Redis configurado
- [ ] Compressão de imagens
- [ ] CDN para assets (opcional)

### Escalabilidade
- [ ] Múltiplos workers (se necessário)
- [ ] Load balancer (se necessário)
- [ ] Banco de dados replicado (se necessário)

## 🔐 Backup

### Banco de Dados
```bash
# Backup manual
pg_dump telegram_preview_bot > backup_$(date +%Y%m%d).sql

# Backup automático (cron)
0 2 * * * pg_dump telegram_preview_bot > /backups/db_$(date +\%Y\%m\%d).sql
```

### Arquivos
```bash
# Backup uploads
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/

# Backup .env
cp .env .env.backup
```

## ✅ Checklist Final

- [ ] Sistema rodando em produção
- [ ] Todos os serviços ativos (backend, worker, dashboard)
- [ ] Testes de ponta a ponta realizados
- [ ] Monitoramento configurado
- [ ] Backups configurados
- [ ] Documentação atualizada
- [ ] Equipe treinada
- [ ] Plano de contingência definido

---

**Data de Deploy:** ___/___/______
**Responsável:** _________________
**Versão:** 1.0.0
