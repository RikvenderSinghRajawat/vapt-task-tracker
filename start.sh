#!/usr/bin/env bash
# ======================================================================
# eKavach VAPT Tracker — Production Start
# ======================================================================
# Usage:  ./start.sh              # start via PM2 (default)
#         ./start.sh --direct     # start without PM2
#         ./start.sh --build      # rebuild frontend then start
#         ./start.sh --restart    # restart running instance
#         ./start.sh --status     # check status only
#         ./start.sh --help
# ======================================================================

set -euo pipefail

# ── Paths ──────────────────────────────────────────────────────────────
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
LOG_DIR="$ROOT_DIR/logs"
ENV_FILE="$BACKEND_DIR/.env"
ECO_FILE="$BACKEND_DIR/ecosystem.config.js"
PID_FILE="$ROOT_DIR/backend.pid"
mkdir -p "$LOG_DIR"

# ── Colors ─────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $1"; }
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }

# ── Parse args ─────────────────────────────────────────────────────────
DIRECT_MODE=false; REBUILD=false; RESTART=false; STATUS_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --direct) DIRECT_MODE=true ;;
    --build)  REBUILD=true ;;
    --restart) RESTART=true ;;
    --status) STATUS_ONLY=true ;;
    --help) echo "Usage: ./start.sh [--direct] [--build] [--restart] [--status]"; exit 0 ;;
  esac
done

# ── Status check ────────────────────────────────────────────────────────
check_running() {
  local pid
  if [ -f "$PID_FILE" ]; then
    pid=$(cat "$PID_FILE" 2>/dev/null || echo "")
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      echo "$pid"
      return 0
    fi
  fi
  local pm2_pid
  pm2_pid=$(pm2 pid ekavach-api 2>/dev/null || echo "")
  if [ -n "$pm2_pid" ] && [ "$pm2_pid" != "0" ]; then
    echo "$pm2_pid"
    return 0
  fi
  local proc_pid
  proc_pid=$(pgrep -f "node src/app.js" 2>/dev/null | head -1 || echo "")
  if [ -n "$proc_pid" ]; then
    echo "$proc_pid"
    return 0
  fi
  return 1
}

get_port() {
  grep -i '^PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 | head -1 | tr -d ' "' || echo "5000"
}

get_host_ip() {
  hostname -I 2>/dev/null | awk '{print $1}' || ip route get 1 2>/dev/null | awk '{print $7}' || echo "127.0.0.1"
}

if [ "$STATUS_ONLY" = true ]; then
  PORT=$(get_port)
  if pid=$(check_running); then
    ok "Backend running (PID: $pid) on port $PORT"
    curl -sf "http://127.0.0.1:${PORT}/api/health" 2>/dev/null && ok "Health check passed" || warn "Health check failed"
  else
    warn "Backend not running"
  fi
  exit 0
fi

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   eKavach VAPT Tracker — Start        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"

# ── Pre-flight checks ──────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  fail "No backend/.env found. Run ./setup.sh first."
  exit 1
fi

if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  log "Installing backend dependencies..."
  (cd "$BACKEND_DIR" && npm install --legacy-peer-deps) || warn "npm install failed (continuing)"
fi

# ── Storage dirs ───────────────────────────────────────────────────────
for dir in reports audits findings evidence temp avatars exports backups; do
  mkdir -p "$ROOT_DIR/storage/$dir"
done

# ── Rebuild frontend if requested ─────────────────────────────────────
if [ "$REBUILD" = true ] && [ -d "$ROOT_DIR/frontend" ]; then
  log "Rebuilding frontend..."
  (cd "$ROOT_DIR/frontend" && npm run build) || warn "Frontend build failed (continuing)"
fi

# ── Load config ────────────────────────────────────────────────────────
PORT=$(get_port)
HOST_IP=$(get_host_ip)
MONGO_URI=$(grep -i '^MONGO_URI=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | head -1 | tr -d '"' || echo "mongodb://127.0.0.1:27017/vapt_tracker")

# ── Restart running instance ──────────────────────────────────────────
if [ "$RESTART" = true ]; then
  if pid=$(check_running); then
    log "Stopping running instance (PID: $pid)..."
    kill "$pid" 2>/dev/null || true
    sleep 2
    ok "Stopped"
  fi
fi

# ── Port availability check ────────────────────────────────────────────
if ss -tlnp "sport = :$PORT" 2>/dev/null | grep -q .; then
  existing_pid=$(ss -tlnp "sport = :$PORT" 2>/dev/null | grep -oP 'pid=\K\d+' || echo "")
  if [ -n "$existing_pid" ]; then
    warn "Port $PORT is already in use by PID $existing_pid"
    if kill -0 "$existing_pid" 2>/dev/null; then
      log "Using existing process on port $PORT"
      ok "Backend already running (PID: $existing_pid)"
      # Still check health
    else
      warn "Stale port binding. Cleaning up..."
      fuser -k "${PORT}/tcp" 2>/dev/null || true
      sleep 1
    fi
  fi
fi

# ── MongoDB check with auto-recovery ────────────────────────────────────
log "Checking MongoDB..."
mongo_connectable() {
  if command -v mongosh &>/dev/null; then
    mongosh "$MONGO_URI" --eval "db.runCommand({ ping: 1 })" --quiet 2>/dev/null
  elif command -v mongo &>/dev/null; then
    mongo "$MONGO_URI" --eval "db.runCommand({ ping: 1 })" --quiet 2>/dev/null
  else
    node -e "require('mongoose').connect('$MONGO_URI',{serverSelectionTimeoutMS:5000}).then(()=>process.exit(0)).catch(()=>process.exit(1))" 2>/dev/null
  fi
}

MONGO_RUNNING=false
mongo_connectable && MONGO_RUNNING=true

if [ "$MONGO_RUNNING" = false ]; then
  warn "MongoDB not reachable. Attempting to start..."
  for svc in mongod mongodb; do
    if systemctl list-units --full -all 2>/dev/null | grep -q "$svc"; then
      sudo systemctl start "$svc" 2>/dev/null || true
      sleep 2
      break
    fi
  done
  pgrep -x mongod >/dev/null || {
    mkdir -p /tmp/mongodb
    mongod --fork --logpath /tmp/mongod-start.log --dbpath /tmp/mongodb 2>/dev/null || true
  }
  sleep 3
  mongo_connectable && MONGO_RUNNING=true
fi

[ "$MONGO_RUNNING" = true ] && ok "MongoDB reachable" || warn "MongoDB not reachable — app may have limited functionality"

# ── Backend start ──────────────────────────────────────────────────────
if pgrep -f "node src/app.js" >/dev/null 2>&1; then
  if [ "$RESTART" = true ]; then
    log "Restarting backend..."
    pkill -f "node src/app.js" 2>/dev/null || true
    sleep 2
  else
    ok "Backend already running"
    # Show summary and exit
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║        eKavach VAPT Tracker                     ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}  Mode:     Production"
    echo -e "${GREEN}║${NC}  Port:     $PORT"
    echo -e "${GREEN}║${NC}  API:      http://localhost:${PORT}/api"
    echo -e "${GREEN}║${NC}  Health:   http://localhost:${PORT}/api/health"
    echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
    exit 0
  fi
fi

if command -v pm2 &>/dev/null && [ "$DIRECT_MODE" = false ]; then
  log "Starting backend via PM2..."
  pm2 delete ekavach-api 2>/dev/null || true

  if [ -f "$ECO_FILE" ]; then
    pm2 start "$ECO_FILE" 2>&1 | tail -2
  else
    pm2 start "$BACKEND_DIR/src/app.js" \
      --name ekavach-api \
      --cwd "$BACKEND_DIR" \
      --env NODE_ENV=production \
      --max-memory-restart 500M \
      --error "$LOG_DIR/pm2-error.log" \
      --output "$LOG_DIR/pm2-out.log" 2>&1 | tail -2
  fi
  pm2 save 2>/dev/null || true
  ok "PM2: ekavach-api started"
else
  log "Starting backend directly on 0.0.0.0:${PORT}..."
  pkill -f "node src/app.js" 2>/dev/null || true
  sleep 1

  cd "$BACKEND_DIR"
  env PORT="$PORT" NODE_ENV=production nohup node src/app.js > "$LOG_DIR/backend.log" 2>&1 &
  BACKEND_PID=$!
  echo "$BACKEND_PID" > "$PID_FILE"
  cd "$ROOT_DIR"
  ok "Backend started (PID: $BACKEND_PID) — logs: logs/backend.log"
fi

# ── Wait for health ───────────────────────────────────────────────────
log "Waiting for backend to be ready..."
HEALTHY=false
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${PORT}/api/health" > /dev/null 2>&1; then
    HEALTHY=true
    ok "Backend healthy (attempt $i)"
    break
  fi
  sleep 1
done

if [ "$HEALTHY" = false ]; then
  warn "Health check timed out after 30s"
  [ -f "$LOG_DIR/backend.log" ] && tail -5 "$LOG_DIR/backend.log"
fi

# ── Check Nginx status ─────────────────────────────────────────────────
NGINX_ACTIVE=false
if systemctl is-active --quiet nginx 2>/dev/null; then
  NGINX_ACTIVE=true
fi

# ── Summary ────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        eKavach VAPT Tracker                     ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  Mode:     Production"
if [ "$DIRECT_MODE" = false ] && command -v pm2 &>/dev/null; then
  echo -e "${GREEN}║${NC}  Manager:  PM2 (pm2 logs ekavach-api)"
fi
echo -e "${GREEN}║${NC}  API:      http://localhost:${PORT}/api"
echo -e "${GREEN}║${NC}  Health:   http://localhost:${PORT}/api/health"
echo -e "${GREEN}║${NC}  Login:    admin@example.com / CHANGE_SUPER_ADMIN_PASSWORD"
if [ "$NGINX_ACTIVE" = true ]; then
  echo -e "${GREEN}║${NC}  Website:  http://${HOST_IP}"
fi
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ── Tail logs if running directly ─────────────────────────────────────
if [ "$DIRECT_MODE" = true ] && [ "$HEALTHY" = true ]; then
  log "Streaming backend logs (Ctrl+C to stop)..."
  if [ -f "$LOG_DIR/backend.log" ]; then
    tail -f "$LOG_DIR/backend.log"
  fi
fi
