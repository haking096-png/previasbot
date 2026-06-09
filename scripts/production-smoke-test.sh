#!/bin/bash
# ===========================================
# PRODUCTION SMOKE TEST - Telegram Preview Bot
# ===========================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuração
BACKEND_URL="${1:-https://backend-production-XXXX.up.railway.app}"
DASHBOARD_URL="${2:-https://dashboard-production-XXXX.up.railway.app}"
REPORT_FILE="PRODUCTION_TEST_REPORT.md"

# Contadores
PASSED=0
FAILED=0
TESTS=()

# Função para testar
test_endpoint() {
  local name="$1"
  local url="$2"
  local method="${3:-GET}"
  local expected_status="${4:-200}"
  local body="$5"

  echo -n "Testing: $name... "

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo -e "\n000")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" \
      ${body:+-d "$body"} "$url" 2>/dev/null || echo -e "\n000")
  fi

  status=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [ "$status" = "$expected_status" ]; then
    echo -e "${GREEN}PASS${NC} (HTTP $status)"
    PASSED=$((PASSED + 1))
    TESTS+=("| $name | PASS | HTTP $status | $url |")
 return 0
  else
    echo -e "${RED}FAIL${NC} (HTTP $status, expected $expected_status)"
    FAILED=$((FAILED + 1))
    TESTS+=("| $name | FAIL | HTTP $status (expected $expected_status) | $url |")
    return 1
  fi
}

# Header do relatório
cat > "$REPORT_FILE" << 'EOF'
# PRODUCTION TEST REPORT
========================================

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Backend URL:** $BACKEND_URL
**Dashboard URL:** $DASHBOARD_URL

## Test Results

| Test | Status | Response | URL |
|------|--------|----------|-----|
EOF

echo "=========================================="
echo "PRODUCTION SMOKE TEST"
echo "=========================================="
echo ""
echo "Backend URL: $BACKEND_URL"
echo "Dashboard URL: $DASHBOARD_URL"
echo ""

# 1. Backend Health Check
test_endpoint "Backend Health" "$BACKEND_URL/health"

# 2. Database Health
test_endpoint "Database Health" "$BACKEND_URL/api/health/db"

# 3. Redis Health
test_endpoint "Redis Health" "$BACKEND_URL/api/health/redis"

# 4. Dashboard HTTP200
test_endpoint "Dashboard Root" "$DASHBOARD_URL"

# 5. API Channels
test_endpoint "API Channels" "$BACKEND_URL/api/channels"

# 6. API Templates
test_endpoint "API Templates" "$BACKEND_URL/api/templates"

# 7. API Posts
test_endpoint "API Posts" "$BACKEND_URL/api/posts"

# 8. API Media
test_endpoint "API Media" "$BACKEND_URL/api/media"

# 9. API Schedules
test_endpoint "API Schedules" "$BACKEND_URL/api/schedules"

# 10. Telegram Health (se configurado)
test_endpoint "Telegram Health" "$BACKEND_URL/api/health/telegram"

# Resumo
echo ""
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

# Gerar relatório final
cat >> "$REPORT_FILE" << EOF

## Summary

- **Passed:** $PASSED
- **Failed:** $FAILED
- **Total:** $((PASSED + FAILED))

## Status

EOF

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}ALL TESTS PASSED${NC}"
  echo "## Status" >> "$REPORT_FILE"
  echo "**ALL TESTS PASSED**" >> "$REPORT_FILE"
 exit 0
else
  echo -e "${RED}SOME TESTS FAILED${NC}"
  echo "## Status" >> "$REPORT_FILE"
  echo "**SOME TESTS FAILED**" >> "$REPORT_FILE"
  exit 1
fi
