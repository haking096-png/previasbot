#!/bin/bash
# Script para validar que tudo está OK antes de fazer deploy
# Rode: bash scripts/validate-deploy.sh

set -e

echo "🔍 Validando configuração para deploy..."
echo ""

# 1. Verificar que tem .env ou .env.production
if [ ! -f ".env" ] && [ ! -f "backend/.env" ]; then
  echo "❌ Nenhum arquivo .env encontrado"
  echo "   Copie .env.production.example para .env e preencha"
  exit 1
fi
echo "✅ Arquivo .env encontrado"

# 2. Verificar variáveis obrigatórias
REQUIRED_VARS=("DATABASE_URL" "REDIS_URL" "JWT_SECRET" "ADMIN_PASSWORD" "TELEGRAM_BOT_TOKEN" "GROK_API_KEY")

if [ -f "backend/.env" ]; then
  ENV_FILE="backend/.env"
else
  ENV_FILE=".env"
fi

for var in "${REQUIRED_VARS[@]}"; do
  if ! grep -q "^${var}=" "$ENV_FILE" || grep -q "^${var}=$" "$ENV_FILE" || grep -q "^${var}=change-me\|your-\|xxx\|cole-aqui" "$ENV_FILE"; then
    echo "❌ $var não configurado ou com valor padrão em $ENV_FILE"
    exit 1
  fi
  echo "✅ $var configurado"
done

# 3. Build do backend
echo ""
echo "🔨 Compilando backend..."
cd backend
npm run build > /tmp/backend-build.log 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Backend compilou"
else
  echo "❌ Backend falhou ao compilar:"
  cat /tmp/backend-build.log
  exit 1
fi
cd ..

# 4. Build do frontend
echo ""
echo "🔨 Compilando frontend..."
cd dashboard
npm run build > /tmp/frontend-build.log 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Frontend compilou"
else
  echo "❌ Frontend falhou ao compilar:"
  cat /tmp/frontend-build.log
  exit 1
fi
cd ..

# 5. Verificar arquivos de deploy
echo ""
echo "📋 Verificando arquivos de deploy..."
DEPLOY_FILES=("DEPLOY.md" "backend/railway.json" "dashboard/vercel.json" ".env.production.example")
for f in "${DEPLOY_FILES[@]}"; do
  if [ -f "$f" ]; then
    echo "✅ $f"
  else
    echo "❌ $f nao encontrado"
    exit 1
  fi
done

# 6. Verificar se git está configurado
echo ""
echo "📦 Verificando git..."
if [ -d ".git" ]; then
  if git remote -v | grep -q "origin"; then
    REMOTE=$(git remote get-url origin)
    echo "✅ Repositorio git: $REMOTE"
  else
    echo "⚠️  Sem remote origin. Configure com:"
    echo "   git remote add origin https://github.com/SEU_USER/telegram-preview-bot.git"
  fi
else
  echo "⚠️  Nao e um repositorio git. Inicialize com:"
  echo "   git init && git add . && git commit -m 'init'"
fi

echo ""
echo "✨ Tudo OK! Pode fazer deploy seguindo DEPLOY.md"
