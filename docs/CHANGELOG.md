# CHANGELOG - Correções Aplicadas

## 2026-06-06

### Segurança

#### CRITICAL - Corrigidos
- [x] **JWT_SECRET obrigatório**: Agora lança erro fatal se não configurado (`requiredEnv`)
- [x] **ADMIN_PASSWORD obrigatório**: Agora lança erro fatal se não configurado
- [x] **CORS restrito**: Apenas origens configuradas podem acessar
- [x] **Rate limiting mais seguro**: Skip apenas para GET de imagens

#### HIGH - Corrigidos
- [x] **Bot cache LRU**: Implementado limite de 50 bots no cache
- [x] **Telegram timeouts**: Adicionados timeouts de 30s em todas as chamadas
- [x] **Validação de input**: botToken e chatId validados com regex
- [x] **Circuit breaker Grok**: Implementado para evitar cascade failures
- [x] **Lock distribuído**: Implementado para workers CTA/Enquete

### Infraestrutura

- [x] **Health checks completos**: Novos endpoints `/api/health/*`
- [x] **Health Center dashboard**: Nova página de monitoramento
- [x] **Logs panel**: Nova página de logs com filtros
- [x] **Migration índices**: SQL para adicionar índices de performance

### Correções de Código

- [x] **console.log → logger**: Substituídos todos os console.log no backend
- [x] **Race condition publish**: Transaction serializable no worker
- [x] **Exponential backoff + jitter**: Adicionado jitter ao retry da API Grok

### Novos Arquivos

```
backend/src/utils/
├── circuitBreaker.ts      # Circuit breaker pattern
├── distributedLock.ts     # Distributed lock via Redis
└── health.routes.ts       # Health check endpoints

dashboard/src/app/dashboard/
├── system/page.tsx        # Health Center
└── logs/page.tsx         # Logs Panel

backend/prisma/migrations/
└── add_performance_indexes.sql  # Índices de performance
```

### Próximos Passos

- [ ] Executar migration de índices
- [ ] Configurar variáveis ambiente obrigatórias no Railway
- [ ] Testar health checks
- [ ] Monitorar circuit breaker

### Variáveis de Ambiente Obratórias

```env
JWT_SECRET=<valor-seguro>       # Obrigatório - não tem mais fallback
ADMIN_PASSWORD=<senha-forte>   # Obrigatório - não tem mais fallback
ALLOWED_ORIGINS=https://seu-dominio.com  # Opcional - default é localhost e railway
```

### Padrões Implementados

1. **Circuit Breaker**: Abre após 5 falhas, fecha após 2 sucessos
2. **Distributed Lock**: TTL de 30s, sem retry (skip se bloqueado)
3. **LRU Cache**: Limite de 50 bots, evict mais antigo
4. **Timeout**: 30s para Telegram, 10s para connection test
