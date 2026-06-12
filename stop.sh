#!/usr/bin/env bash
# ======================================================================
# eKavach VAPT Tracker — Stop
# ======================================================================
# Usage:  ./stop.sh          # interactive
#         ./stop.sh --force  # non-interactive stop
#         ./stop.sh --all    # stop everything including nginx & mongo
# ======================================================================

set -euo pipefail

FORCE=false
STOP_NGINX=false
STOP_MONGO=false

for arg in "$@"; do
  case $arg in
    --force) FORCE=true ;;
    --all)   FORCE=true; STOP_NGINX=true; STOP_MONGO=true ;;
    --nginx) STOP_NGINX=true ;;
    --mongo) STOP_MONGO=true ;;
    *) ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $1"; }
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     eKavach VAPT Tracker — Stop       ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"

log "Stopping eKavach services..."

# Stop PM2 managed processes
if command -v pm2 &>/dev/null; then
  if pm2 list 2>/dev/null | grep -q ekavach; then
    pm2 stop ekavach-api 2>/dev/null && ok "PM2: ekavach-api stopped" || true
  fi
fi

# Kill processes from PID files
for pidfile in backend.pid frontend.pid; do
  if [ -f "$pidfile" ]; then
    kill "$(cat "$pidfile")" 2>/dev/null && ok "Killed process from $pidfile" || true
    rm -f "$pidfile"
  fi
done

# Kill any remaining app processes
pkill -f "node src/app.js" 2>/dev/null && ok "Backend processes killed" || true
pkill -f "react-scripts" 2>/dev/null && ok "Frontend processes killed" || true

# Stop nginx
if [ "$STOP_NGINX" = true ] || [ "$FORCE" = true ]; then
  if systemctl is-active --quiet nginx 2>/dev/null; then
    systemctl stop nginx 2>/dev/null && ok "Nginx stopped" || true
  fi
fi

# Stop MongoDB
if [ "$STOP_MONGO" = true ]; then
  if systemctl is-active --quiet mongod 2>/dev/null; then
    systemctl stop mongod 2>/dev/null && ok "MongoDB stopped" || true
  elif systemctl is-active --quiet mongodb 2>/dev/null; then
    systemctl stop mongodb 2>/dev/null && ok "MongoDB stopped" || true
  fi
fi

ok "eKavach services stopped"
