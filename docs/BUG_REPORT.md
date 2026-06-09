# BUG REPORT — Telegram Preview Bot v2

**Data**: 2026-06-06
**Versão do Código**: main (último commit: a771295)
**Analisado por**: Claude Code (Análise Manual Completa)

---

## RESUMO EXECUTIVO

| Severidade | Quantidade |
|------------|------------|
| CRITICAL | 4 |
| HIGH | 8 |
| MEDIUM | 12 |
| LOW | 6 |

---

## BUGS CRÍTICOS

### 1. [CRITICAL] Autenticação Fraca - Senha Admin Hardcoded
**Localização**: `backend/src/config/index.ts:10`
```typescript
adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
```
**Problema**: Senha default exposta no código. Qualquer pessoa com acesso ao código pode entrar.
**Impacto**: Acesso não autorizado ao sistema.
**Correção**: Remover fallback ou usar erro fatal se não configurado.
```typescript
adminPassword: process.env.ADMIN_PASSWORD || throw new Error('ADMIN_PASSWORD is required'),
```
**Status**: ⚠️ Pendente

---

### 2. [CRITICAL] JWT Secret Fraco
**Localização**: `backend/src/config/index.ts:9`
```typescript
jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
```
**Problema**: JWT secret hardcoded com valor inseguro.
**Impacto**: Tokens JWT podem ser forjados.
**Correção**:
```typescript
jwtSecret: process.env.JWT_SECRET || throw new Error('JWT_SECRET is required'),
```
**Status**: ⚠️ Pendente

---

### 3. [CRITICAL] Rate Limiting Ignora Upload de Mídia
**Localização**: `backend/src/index.ts:32-37`
```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  skip: (req) => req.path.startsWith('/api/media') && req.path.includes('/image'),
  validate: { xForwardedForHeader: false },
});
```
**Problema**: O skip está verificando `/api/media/:id/image` mas não verifica outros endpoints de mídia.
**Impacto**: Ataques de DoS podem sobrecarregar o servidor.
**Correção**: Remover o skip ou fazer whitelist mais restrito.
**Status**: ⚠️ Pendente

---

### 4. [CRITICAL] Falta Validação no Upload de Mídia
**Localização**: `backend/src/controllers/media.controller.ts:52-54`
```typescript
if (!channel.mediaStorageChatId) {
  return res.status(400).json({ error: 'Canal de armazenamento de mídia não configurado...' });
}
```
**Problema**: Não valida se o bot tem permissão no canal de armazenamento.
**Impacto**: Upload pode falhar silenciosamente ou enviar para lugar errado.
**Correção**: Adicionar validação de permissão do bot no canal.
**Status**: ⚠️ Pendente

---

## BUGS HIGH

### 5. [HIGH] memory leak no Bot Cache
**Localização**: `backend/src/services/telegram.service.ts:11`
```typescript
private botCache: Map<string, Telegraf> = new Map();
```
**Problema**: Mapa de bots cresce indefinidamente. Nunca é limpo.
**Impacto**: Memory leak em produção de longo prazo.
**Correção**: Adicionar LRU cache com limite de tamanho.
```typescript
private botCache: Map<string, Telegraf> = new Map();
private readonly MAX_CACHE_SIZE = 50;
```
**Status**: ⚠️ Pendente

---

### 6. [HIGH] Sem Circuit Breaker na API Grok
**Localização**: `backend/src/services/grok.service.ts`
**Problema**: Não há circuit breaker. Falhas sequenciais podem sobrecarregar a API.
**Impacto**: Cascata de falhas em erros da API.
**Correção**: Implementar circuit breaker pattern.
**Status**: ⚠️ Pendente

---

### 7. [HIGH] Telegram API Sem Timeout
**Localização**: `backend/src/services/telegram.service.ts:80-98`
```typescript
message = await bot.telegram.sendPhoto(targetChatId, source, {...});
```
**Problema**: Chamadas Telegram não têm timeout configurado.
**Impacto**: Requests podem ficar pendentes indefinidamente.
**Correção**: Adicionar timeout de 30s em todas as chamadas.
**Status**: ⚠️ Pendente

---

### 8. [HIGH] Validação Insuficiente de Input
**Localização**: `backend/src/controllers/channel.controller.ts:7-13`
```typescript
if (!name || !botToken || !chatId || !ctaLink) {
  return res.status(400).json({ error: '...' });
}
```
**Problema**: Não valida formato de botToken, chatId, etc.
**Impacto**: Dados inválidos entram no banco.
**Correção**: Adicionar regex para botToken (formato: `\d+:[A-Za-z0-9_-]+`) e validação de chatId.
**Status**: ⚠️ Pendente

---

### 9. [HIGH] Workers Podem Duplicar Posts
**Localização**: `backend/src/workers/publish.worker.ts:59-68`
**Problema**: Race condition entre verificar status e atualizar. Dois workers podem publicar o mesmo post.
**Impacto**: Posts duplicados no Telegram.
**Correção**: Usar transação atômica com `UPDATE ... WHERE status = 'SCHEDULED'`.
**Status**: ⚠️ Pendente

---

### 10. [HIGH] Enquete/CTA Worker Sem Lock
**Localização**: `backend/src/workers/ctaPresente.worker.ts:10-15`
```typescript
let lastCheckedMinute = '';
// ...
if (currentTime === lastCheckedMinute) return;
```
**Problema**: Variável global não é thread-safe. Pode causar posts duplicados.
**Impacto**: Múltiplas verificações no mesmo minuto = posts duplicados.
**Correção**: Usar Redis para lock distribuídos.
**Status**: ⚠️ Pendente

---

### 11. [HIGH] CORS Permite Qualquer Origem
**Localização**: `backend/src/index.ts:28`
```typescript
app.use(cors());
```
**Problema**: CORS configurado para permitir qualquer origem.
**Impacto**: Vulnerabilidade a ataques CSRF.
**Correção**:
```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://telegram-bot-v2.up.railway.app'],
  credentials: true,
}));
```
**Status**: ⚠️ Pendente

---

### 12. [HIGH] Logs Não Estruturados em Alguns Lugares
**Localização**: Múltiplos arquivos
**Problema**: `console.log` e `console.error` ainda usados em vez de logger.
**Impacto**: Logs podem não ser capturados corretamente.
**Correção**: Substituir todos `console.*` por `logger.*`.
**Status**: ⚠️ Pendente

---

## BUGS MEDIUM

### 13. [MEDIUM] Erro Genérico 500 Para Todos os Falhas
**Localização**: `backend/src/middleware/errorHandler.ts:17`
```typescript
res.status(500).json({
  error: 'Internal server error',
  ...
});
```
**Problema**: Todos os erros retornam 500, mesmo erros de validação 400.
**Impacto**: Dificulta debugging e tratamento de erros no frontend.
**Correção**: Mapear tipos de erro para códigos HTTP apropriados.
**Status**: ⚠️ Pendente

---

### 14. [MEDIUM] Falta Health Check Robusto
**Localização**: `backend/src/index.ts:52-54`
```typescript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```
**Problema**: Health check não verifica DB, Redis, ou workers.
**Impacto**: Load balancer pode rotear para instâncias não saudáveis.
**Correção**: Health check completo implementado.
**Status**: ✅ Parcialmente corrigido (novos endpoints adicionados)

---

### 15. [MEDIUM] Retry Logic Inconsistente
**Localização**: `backend/src/services/grok.service.ts:281-349`
**Problema**: Retry com exponential backoff mas sem jitter.
**Impacto**: "Thundering herd" quando API volta a funcionar.
**Correção**: Adicionar jitter aleatório ao delay.
**Status**: ⚠️ Pendente

---

### 16. [MEDIUM] Mídia Sem Cleanup Automático
**Localização**: `backend/src/controllers/media.controller.ts`
**Problema**: Mídia deletada não é removida fisicamente (apenas do DB).
**Impacto**: Disco do Telegram storage continua crescendo.
**Correção**: Implementar política de retenção ou cleanup manual.
**Status**: ⚠️ Pendente

---

### 17. [MEDIUM] Prisma Sem Índices em Queries Frequentes
**Localização**: `backend/prisma/schema.prisma`
**Problema**: Possível falta de índices em `status`, `createdAt`, `channelId`.
**Impacto**: Queries lentas em tabelas grandes.
**Correção**: Adicionar índices:
```prisma
@@index([status])
@@index([channelId, status])
@@index([scheduledFor])
```
**Status**: ⚠️ Pendente

---

### 18. [MEDIUM] Dashboard Sem Error Boundary
**Localização**: `dashboard/src/`
**Problema**: Se qualquer componente lançar erro, app inteiro quebra.
**Impacto**: Experiência ruim para usuário.
**Correção**: Adicionar Error Boundaries em páginas críticas.
**Status**: ⚠️ Pendente

---

### 19. [MEDIUM] Axios Retry Configurado Incorretamente
**Localização**: `dashboard/src/lib/api.ts:14-35`
```typescript
if (config._retryCount < 3) {
  config._retryCount++;
  await new Promise(resolve => setTimeout(resolve, 1500 * config._retryCount));
```
**Problema**: Retry interceptor não está resetando `_retryCount` em sucesso.
**Impacto**: Contador pode acumular entre requests.
**Correção**: Resetar contador após sucesso.
**Status**: ⚠️ Pendente

---

### 20. [MEDIUM] Worker Sem Graceful Shutdown
**Localização**: `backend/src/workers/index.ts:65-77`
**Problema**: Handlers SIGTERM/SIGINT existem mas não aguardam jobs terminarem.
**Impacto**: Jobs podem ser perdidos durante shutdown.
**Correção**: Aguardar jobs completarem antes de exit.
**Status**: ⚠️ Pendente

---

### 21. [MEDIUM] Mídia Não Valida Tipo de Arquivo Corretamente
**Localização**: `backend/src/controllers/media.controller.ts:15-28`
```typescript
const imageTypes = /jpeg|jpg|png/;
const videoTypes = /mp4|mov|avi|webm|video/;
```
**Problema**: Regex pode ser bypassado. Não valida MIME type real.
**Impacto**: Arquivos maliciosos podem ser enviados.
**Correção**: Usar `file-type` npm package para validação real.
**Status**: ⚠️ Pendente

---

### 22. [MEDIUM] Template Engine Usado em Produção
**Localização**: `backend/src/services/ctaEnquete.service.ts`
**Problema**: Templates são interpretados com `JSON.parse` sem validação.
**Impacto**: Template malicioso pode causar DoS ou XSS.
**Correção**: Validar schema do template com Zod.
**Status**: ⚠️ Pendente

---

### 23. [MEDIUM] Sem Persistência de Fila de Jobs
**Localuração**: `backend/src/utils/queue.ts`
**Problema**: BullMQ configurado com Redis mas sem persistência garantida.
**Impacto**: Jobs podem ser perdidos em crash do Redis.
**Correção**: Configurar `backoff` e `removeOnComplete` adequadamente.
**Status**: ⚠️ Pendente

---

### 24. [MEDIUM] Dashboard Sem Loading States Adequados
**Localização**: `dashboard/src/app/dashboard/channels/page.tsx`
**Problema**: Algumas operações (delete, toggle) não têm feedback visual.
**Impacto**: Usuário não sabe se ação funcionou.
**Correção**: Adicionar loading spinners em botões.
**Status**: ⚠️ Pendente

---

## BUGS LOW

### 25. [LOW] Variáveis de Ambiente Não Validadas na Inicialização
**Localização**: `backend/src/config/index.ts`
**Problema**: Variáveis são lidas mas não validadas (tipo, presença).
**Impacto**: Erros só aparecem quando código tenta usar variável.
**Correção**: Validar envs na inicialização com Zod.
**Status**: ⚠️ Pendente

---

### 26. [LOW] Mensagens de Erro Diferentes no Frontend e Backend
**Localização**: Múltiplos controllers
**Problema**: Mensagens em português BR vs inglês.
**Impacto**: Inconsistência visual.
**Correção**: Padronizar mensagens em português.
**Status**: ⚠️ Pendente

---

### 27. [LOW] Censor Não Cobre Variações
**Localização**: `backend/src/utils/censor.ts`
**Problema**: WORD_MAP não cobre todas as variações (ex: "c*zinho" já censurado).
**Impacto**: Algumas palavras passam.
**Correção**: Adicionar mais variações e regex mais inteligente.
**Status**: ⚠️ Pendente

---

### 28. [LOW] Docker Não Remove Imagens Intermediárias
**Localização**: `backend/Dockerfile:8`
```dockerfile
RUN npm install
```
**Problema**: BuildDocker não usa `--production` ou `--omit=dev`.
**Impacto**: Imagem maior.
**Correção**: Dividir em stages ou usar `.dockerignore`.
**Status**: ⚠️ Pendente

---

### 29. [LOW] Sem Versionamento de API
**Localização**: `backend/src/index.ts`
**Problema**: Endpoints não têm versão (ex: `/api/v1/`).
**Impacto**: Breaking changes causam problemas.
**Correção**: Adicionar `/api/v1/` prefix.
**Status**: ⚠️ Pendente

---

### 30. [LOW] Código Duplicado Entre Services
**Localização**: `ctaPresente.worker.ts` vs `ctaEnquete.service.ts`
**Problema**: Lógica de geração CTA e Enquete duplicada.
**Impacto**: Manutenção mais difícil.
**Correção**: Extrair lógica comum para service compartilhado.
**Status**: ⚠️ Pendente

---

## RECOMENDAÇÕES ADICIONAIS

### Performance
1. Adicionar caching com Redis para queries frequentes
2. Implementar pagination em todos os endpoints de lista
3. Usar prepared statements para queries Prisma
4. Comprimir responses gzip/brotli

### Segurança
1. Implementar rate limiting por IP no Redis
2. Adicionar CSP headers
3. Implementar request signing
4. Audit logging de ações administrativas

### Observabilidade
1. Adicionar métricas Prometheus
2. Tracing distribuído (OpenTelemetry)
3. Dashboard Grafana para métricas
4. Alertas para erros críticos

### Testing
1. Adicionar Jest + Supertest para API tests
2. Playwright para E2E tests
3. Load testing com k6
4. Testes de integração com DB real

---

## PRIORIDADE DE CORREÇÃO

### Fase 1 (Imediato - Antes do Próximo Deploy)
- [ ] Bug #1: ADMIN_PASSWORD fallback
- [ ] Bug #2: JWT_SECRET fallback
- [ ] Bug #3: Rate limiting skip
- [ ] Bug #5: Bot cache memory leak
- [ ] Bug #7: Telegram timeout
- [ ] Bug #9: Race condition publish

### Fase 2 (Próxima Sprint)
- [ ] Bug #6: Circuit breaker Grok
- [ ] Bug #8: Validação de input
- [ ] Bug #10: Lock distribuído CTA/Enquete
- [ ] Bug #11: CORS restrito
- [ ] Bug #12: console.log → logger
- [ ] Bug #17: Índices Prisma

### Fase 3 (Backlog)
- [ ] Bugs #13-#24 (Medium)
- [ ] Bugs #25-#30 (Low)
- [ ] Recomendações adicionais

---

*Relatório gerado automaticamente. Última atualização: 2026-06-06*
