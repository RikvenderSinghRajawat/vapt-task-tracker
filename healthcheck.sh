#!/usr/bin/env bash
# ======================================================================
# eKavach VAPT Tracker — Deployment Health Check
# ======================================================================
# Usage:
#   chmod +x healthcheck.sh
#   ./healthcheck.sh               # quick check
#   ./healthcheck.sh --verbose     # detailed output
# ======================================================================

set -euo pipefail

VERBOSE=false
[[ "${1:-}" == "--verbose" || "${1:-}" == "-v" ]] && VERBOSE=true

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

PASS=0
FAIL=0
WARN=0

check() {
  local label="$1" cmd="$2"
  if eval "$cmd" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} $label"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} $label"
    FAIL=$((FAIL + 1))
  fi
}

warn_check() {
  local label="$1" cmd="$2"
  if eval "$cmd" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} $label"
    PASS=$((PASS + 1))
  else
    echo -e "  ${YELLOW}⚠${NC} $label"
    WARN=$((WARN + 1))
  fi
}

header() {
  echo -e "\n${BOLD}${CYAN}══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${CYAN}  $1${NC}"
  echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════════════${NC}\n"
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ────────────────────────────────────────────────────────────────
header "eKavach Health Check"
echo -e "  Project: $ROOT_DIR"
echo -e "  Date:    $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "  Host:    $(hostname)"

# ── 1. System ──────────────────────────────────────────────────
header "1. System Checks"

check "OS is Ubuntu/Debian" "grep -qi 'ubuntu\|debian' /etc/os-release 2>/dev/null"
warn_check "Disk space (>1GB free)" "[ \$(df / --output=avail 2>/dev/null | tail -1) -gt 1048576 ]"
warn_check "Memory (>512MB free)" "[ \$(free -m | awk '/^Mem:/{print \$7}') -gt 512 ] 2>/dev/null"

# ── 2. Processes ───────────────────────────────────────────────
header "2. Process Checks"

check "MongoDB running" "systemctl is-active --quiet mongod 2>/dev/null || pgrep -x mongod > /dev/null"
check "Nginx running" "systemctl is-active --quiet nginx 2>/dev/null || pgrep -x nginx > /dev/null"
check "PM2 running" "pgrep -x pm2 > /dev/null 2>&1 || pm2 ping > /dev/null 2>&1"
check "Backend (ekavach-api) in PM2" "pm2 list 2>/dev/null | grep -q ekavach-api"

# ── 3. Network ─────────────────────────────────────────────────
header "3. Network Checks"

BACKEND_PORT="${BACKEND_PORT:-5000}"
check "Port $BACKEND_PORT is listening" "ss -tlnp | grep -q \":$BACKEND_PORT \""
check "Port 80 is listening" "ss -tlnp | grep -q ':80 '"
check "Port 27017 is listening" "ss -tlnp | grep -q ':27017 '"

# ── 4. API Health ──────────────────────────────────────────────
header "4. API Health Checks"

check "Backend /api/health endpoint" "curl -sf http://127.0.0.1:$BACKEND_PORT/api/health > /dev/null 2>&1"
check "Nginx reverse proxy to API" "curl -sf http://127.0.0.1/api/health > /dev/null 2>&1"

# Optional: check MongoDB from API
if curl -sf "http://127.0.0.1:$BACKEND_PORT/api/health" 2>/dev/null | grep -qi '"dbStatus\|"mongodb\|"database' > /dev/null 2>&1; then
  check "MongoDB connected (via API)" "true"
else
  warn_check "MongoDB connected (via API)" "true"
fi

# ── 5. Storage ─────────────────────────────────────────────────
header "5. Storage Checks"

STORAGE_ROOT="${STORAGE_ROOT:-$ROOT_DIR/storage}"

check "Storage root exists" "[ -d '$STORAGE_ROOT' ]"
check "Reports directory exists" "[ -d '$STORAGE_ROOT/reports' ]"
check "Uploads directory exists" "[ -d '$STORAGE_ROOT/uploads' ]"
check "Storage directory is writable" "[ -w '$STORAGE_ROOT/reports' ]"

# ── 6. Frontend ────────────────────────────────────────────────
header "6. Frontend Checks"

FRONTEND_BUILD="$ROOT_DIR/frontend/build"
if [ -d "$FRONTEND_BUILD" ]; then
  check "Frontend build exists" "[ -f '$FRONTEND_BUILD/index.html' ]"
  check "Frontend served via nginx" "curl -sf http://127.0.0.1/ | grep -qi 'html'"
else
  echo -e "  ${YELLOW}⚠${NC} No frontend build found (API-only mode is OK)"
  WARN=$((WARN + 1))
fi

# ── 7. Configuration ───────────────────────────────────────────
header "7. Configuration Checks"

check "Backend .env exists" "[ -f '$ROOT_DIR/backend/.env' ]"
check "Nginx config exists" "[ -f /etc/nginx/sites-enabled/ekavach ]"

# ── 8. Security Checks ─────────────────────────────────────────
header "8. Security Checks"

check "Nginx server_tokens off" "nginx -T 2>/dev/null | grep -q 'server_tokens off'"
check "Nginx denies hidden files" "nginx -T 2>/dev/null | grep -q 'deny all'"

# Check for exposed .env
ENV_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/.env 2>/dev/null || echo "000")
if [ "$ENV_CHECK" = "404" ] || [ "$ENV_CHECK" = "000" ]; then
  check ".env is not exposed" "true"
else
  check ".env is not exposed" "[ \"\$ENV_CHECK\" = \"403\" ]"
fi

# ── Summary ────────────────────────────────────────────────────
header "Health Check Summary"

TOTAL=$((PASS + FAIL + WARN))
echo -e "  ${BOLD}Results:${NC}"
echo -e "  ${GREEN}Pass: $PASS${NC}"
[ "$FAIL" -gt 0 ] && echo -e "  ${RED}Fail: $FAIL${NC}"
[ "$WARN" -gt 0 ] && echo -e "  ${YELLOW}Warn: $WARN${NC}"
echo -e "  Total: $TOTAL checks"

echo ""
if [ "$FAIL" -eq 0 ] && [ "$WARN" -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}✓ All checks passed — eKavach is healthy${NC}"
elif [ "$FAIL" -eq 0 ]; then
  echo -e "  ${YELLOW}${BOLD}⚠ All critical checks passed ($WARN warnings)${NC}"
else
  echo -e "  ${RED}${BOLD}✗ $FAIL checks failed — review issues above${NC}"
  exit 1
fi
echo ""
