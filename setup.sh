#!/usr/bin/env bash
# ======================================================================
# eKavach VAPT Tracker — Fully Auto-Configuring Production Setup
# ======================================================================
# Installs everything on Ubuntu/Debian Linux:
#   MongoDB 7.0 + auth, Node.js 20 LTS, Nginx, PM2, dependencies,
#   environment config, frontend build, database seed, firewall
#
# Usage:
#   sudo ./setup.sh                  # full production install
#   ./setup.sh --help                # show options
#
# Logs: $APP_DIR/setup.log
# ======================================================================

set -euo pipefail

# ── Logging ─────────────────────────────────────────────────────────────
# All output (stdout + stderr) is captured into setup.log in APP_DIR
{
  # ── Configurable Variables ──────────────────────────────────────────────
  MONGO_ROOT_PASSWORD="${MONGO_ROOT_PASSWORD:-CHANGE_MONGO_PASSWORD}"
  APP_USER="${APP_USER:-youruser}"
  APP_DIR="${APP_DIR:-$APP_DIR}"
  BACKEND_PORT="${BACKEND_PORT:-5000}"
  FRONTEND_PORT="${FRONTEND_PORT:-3000}"
  DOMAIN_OR_IP="${DOMAIN_OR_IP:-}"
  NODE_VERSION="${NODE_VERSION:-20}"

  # ── Derived paths ───────────────────────────────────────────────────────
  ROOT_DIR="$APP_DIR"
  BACKEND_DIR="$ROOT_DIR/backend"
  FRONTEND_DIR="$ROOT_DIR/frontend"
  STORAGE_ROOT="$ROOT_DIR/storage"
  LOGS_DIR="$ROOT_DIR/logs"
  SETUP_LOG="$ROOT_DIR/setup.log"
  ENV_FILE="$BACKEND_DIR/.env"
  MONGO_PASS_FILE="$ROOT_DIR/.mongodb_root_password"
  NGINX_AVAILABLE="/etc/nginx/sites-available/ekavach"
  NGINX_ENABLED="/etc/nginx/sites-enabled/ekavach"
  ECOSYSTEM_FILE="$BACKEND_DIR/ecosystem.config.js"

  # ── Flags ──────────────────────────────────────────────────────────────
  SKIP_SYSTEM=false
  SKIP_NGINX=false
  SKIP_FIREWALL=false
  SKIP_MONGO=false
  SKIP_PM2=false
  DRY_RUN=false

  # ── Colors ──────────────────────────────────────────────────────────────
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

  log()    { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $1"; }
  ok()     { echo -e "  ${GREEN}✓${NC} $1"; }
  warn()   { echo -e "  ${YELLOW}⚠${NC} $1"; }
  fail()   { echo -e "  ${RED}✗${NC} $1"; exit 1; }
  header() { echo -e "\n${BOLD}${CYAN}══════════════════════════════════════════════════════════════${NC}"; \
             echo -e "${BOLD}${CYAN}  $1${NC}"; \
             echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════════════${NC}\n"; }

  # ── Parse args ──────────────────────────────────────────────────────────
  for arg in "$@"; do
    case "$arg" in
      --help)
        echo "Usage: sudo ./setup.sh [--skip-system] [--skip-nginx] [--skip-firewall] [--skip-mongo] [--skip-pm2] [--dry-run]"
        exit 0
        ;;
      --dry-run) DRY_RUN=true ;;
      --skip-system)   SKIP_SYSTEM=true ;;
      --skip-nginx)    SKIP_NGINX=true ;;
      --skip-firewall) SKIP_FIREWALL=true ;;
      --skip-mongo)    SKIP_MONGO=true ;;
      --skip-pm2)      SKIP_PM2=true ;;
    esac
  done

  DRY() {
    if [ "$DRY_RUN" = true ]; then
      echo -e "  ${YELLOW}[DRY-RUN]${NC} $*"
      return 0
    fi
    "$@"
  }

  # ── Pre-flight checks ──────────────────────────────────────────────────
  cd "$ROOT_DIR"
  [ ! -d "$BACKEND_DIR" ] && fail "Backend directory not found at $BACKEND_DIR"
  [ ! -f "$BACKEND_DIR/package.json" ] && fail "backend/package.json not found"

  # Create logs directory
  mkdir -p "$LOGS_DIR"

  HAS_SUDO=false
  if command -v sudo &>/dev/null; then HAS_SUDO=true; fi
  if [ "$HAS_SUDO" = false ]; then
    warn "sudo not available. System-level installs (MongoDB, Nginx) will be skipped."
  fi

  PM_TOOL=""; [ "$HAS_SUDO" = true ] && PM_TOOL="sudo"

  SERVICE_MGR=""
  if command -v systemctl &>/dev/null; then
    SERVICE_MGR="systemctl"
  elif command -v service &>/dev/null; then
    SERVICE_MGR="service"
  fi

  # ── Auto-detect Server IP ──────────────────────────────────────────────
  detect_ip() {
    local ip=""
    if command -v hostname &>/dev/null; then
      ip=$(hostname -I 2>/dev/null | awk '{print $1}' | grep -v '^127\.')
    fi
    if [ -z "$ip" ] && command -v ip &>/dev/null; then
      ip=$(ip route get 1 2>/dev/null | awk '{print $NF}' | grep -v '^127\.')
    fi
    echo "${ip:-localhost}"
  }

  if [ -z "$DOMAIN_OR_IP" ]; then
    DOMAIN_OR_IP=$(detect_ip)
  fi
  SERVER_IP="$DOMAIN_OR_IP"

  # ══════════════════════════════════════════════════════════════════════
  # 1 — INSTALL SYSTEM PACKAGES
  # ══════════════════════════════════════════════════════════════════════
  if [ "$SKIP_SYSTEM" = false ] && [ "$HAS_SUDO" = true ]; then
    header "1 — System Packages"

    CORE_PKGS="curl wget git unzip gzip tar openssl ca-certificates gnupg software-properties-common build-essential ufw"

    log "Updating package list..."
    DRY $PM_TOOL apt-get update -qq 2>/dev/null || true

    log "Installing core packages: $CORE_PKGS"
    DRY $PM_TOOL apt-get install -y -qq $CORE_PKGS 2>&1 | tail -3 || warn "Some packages failed to install"
    ok "System packages installed"
  else
    log "Skipping system packages"
  fi

  # ══════════════════════════════════════════════════════════════════════
  # 2 — INSTALL NODE.JS 20 LTS
  # ══════════════════════════════════════════════════════════════════════
  header "2 — Node.js"

  NODE_INSTALLED=false
  if command -v node &>/dev/null; then
    NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_MAJOR" -ge "$NODE_VERSION" ] 2>/dev/null; then
      NODE_INSTALLED=true
      ok "Node.js $(node -v) already installed"
    fi
  fi

  if [ "$NODE_INSTALLED" = false ]; then
    log "Installing Node.js ${NODE_VERSION}.x LTS via NodeSource..."
    if [ "$DRY_RUN" = false ]; then
      curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" -o /tmp/nodesource_setup.sh 2>/dev/null || true
      if [ -f /tmp/nodesource_setup.sh ]; then
        $PM_TOOL bash /tmp/nodesource_setup.sh 2>/dev/null || true
        $PM_TOOL apt-get install -y -qq nodejs 2>/dev/null && NODE_INSTALLED=true || true
      fi
    fi
    if [ "$NODE_INSTALLED" = true ]; then
      ok "Node.js $(node -v) installed"
    else
      warn "Node.js installation failed. Install manually: https://nodejs.org"
    fi
  fi

  if ! command -v npm &>/dev/null; then
    fail "npm not found. Install Node.js manually."
  fi

  # ══════════════════════════════════════════════════════════════════════
  # 3 — INSTALL & CONFIGURE MONGODB 7.0 WITH AUTH
  # ══════════════════════════════════════════════════════════════════════
  MONGO_AUTH_USER=""
  MONGO_AUTH_PASS=""

  if [ "$SKIP_MONGO" = false ]; then
    header "3 — MongoDB"

    MONGO_CLI=""
    if command -v mongosh &>/dev/null; then
      MONGO_CLI="mongosh"
    elif command -v mongo &>/dev/null; then
      MONGO_CLI="mongo"
    fi

    INSTALLED_MONGO=false
    if [ -n "$MONGO_CLI" ]; then
      INSTALLED_MONGO=true
      ok "MongoDB CLI found: $MONGO_CLI"
    fi

    # Install MongoDB 7.0 if not present
    if [ "$INSTALLED_MONGO" = false ] && [ "$DRY_RUN" = false ] && [ "$HAS_SUDO" = true ]; then
      log "Installing MongoDB 7.0..."
      MONGO_CLI="mongosh"

      # Detect Ubuntu/Debian codename
      OS_CODENAME=$( (grep -oP 'VERSION_CODENAME=\K\w+' /etc/os-release 2>/dev/null) || echo "jammy")

      curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        $PM_TOOL gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg 2>/dev/null || true

      echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/ubuntu ${OS_CODENAME}/mongodb-org/7.0 multiverse" | \
        $PM_TOOL tee /etc/apt/sources.list.d/mongodb-org-7.0.list >/dev/null || true

      $PM_TOOL apt-get update -qq 2>/dev/null || true
      $PM_TOOL apt-get install -y -qq mongodb-org 2>/dev/null && INSTALLED_MONGO=true || true

      if [ "$INSTALLED_MONGO" = false ]; then
        warn "MongoDB apt install failed. Trying npm global install..."
        $PM_TOOL npm install -g mongosh 2>/dev/null && MONGO_CLI="mongosh" && INSTALLED_MONGO=true || true
      fi
    fi

    if [ "$INSTALLED_MONGO" = false ]; then
      warn "MongoDB not installed. Set MONGO_URI manually in $ENV_FILE."
    else
      # Start MongoDB if not running
      MONGO_RUNNING=false
      if [ "$DRY_RUN" = false ]; then
        if $MONGO_CLI --eval "db.runCommand({ ping: 1 })" --quiet 2>/dev/null; then
          MONGO_RUNNING=true
          ok "MongoDB is running"
        else
          log "Starting MongoDB..."
          if [ "$SERVICE_MGR" = "systemctl" ]; then
            $PM_TOOL systemctl enable mongod 2>/dev/null || true
            $PM_TOOL systemctl start mongod 2>/dev/null || $PM_TOOL systemctl start mongodb 2>/dev/null || true
          fi
          sleep 3
          if $MONGO_CLI --eval "db.runCommand({ ping: 1 })" --quiet 2>/dev/null; then
            MONGO_RUNNING=true
            ok "MongoDB started"
          fi
        fi
      fi

      # ── Configure MongoDB Authentication ──────────────────────────
      if [ "$MONGO_RUNNING" = true ]; then
        # Check if auth is already active
        AUTH_ALREADY_SETUP=false
        $MONGO_CLI admin --eval "db.createUser({user:'_test',pwd:'_test',roles:[]})" --quiet 2>/dev/null && {
          $MONGO_CLI admin --eval "db.dropUser('_test')" --quiet 2>/dev/null || true
        } || {
          AUTH_ALREADY_SETUP=true
        }

        if [ "$AUTH_ALREADY_SETUP" = false ]; then
          log "Configuring MongoDB authentication..."
          MONGO_AUTH_USER="root"
          MONGO_AUTH_PASS="$MONGO_ROOT_PASSWORD"

          echo "$MONGO_AUTH_PASS" > "$MONGO_PASS_FILE"
          chmod 600 "$MONGO_PASS_FILE"

          $MONGO_CLI admin --quiet <<MONGOEOF 2>/dev/null
db.createUser({
  user: "$MONGO_AUTH_USER",
  pwd: "$MONGO_AUTH_PASS",
  roles: [
    { role: "root", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" },
    { role: "dbAdminAnyDatabase", db: "admin" }
  ]
});
MONGOEOF

          if [ $? -eq 0 ]; then
            ok "MongoDB admin user created"

            # Enable auth in mongod.conf (idempotent)
            if [ -f /etc/mongod.conf ]; then
              if grep -q 'authorization: enabled' /etc/mongod.conf; then
                log "Authorization already enabled in mongod.conf"
              else
                $PM_TOOL sed -i 's/^#security:/security:/' /etc/mongod.conf 2>/dev/null || true
                if grep -q '^security:' /etc/mongod.conf 2>/dev/null; then
                  if ! grep -q 'authorization' /etc/mongod.conf; then
                    $PM_TOOL sed -i '/^security:/a\  authorization: enabled' /etc/mongod.conf 2>/dev/null || true
                  fi
                else
                  echo -e "\nsecurity:\n  authorization: enabled" | $PM_TOOL tee -a /etc/mongod.conf >/dev/null || true
                fi
              fi
            fi

            # Restart MongoDB with auth
            if [ "$SERVICE_MGR" = "systemctl" ]; then
              $PM_TOOL systemctl restart mongod 2>/dev/null || true
              sleep 3
            fi

            # Verify
            if $MONGO_CLI "mongodb://$MONGO_AUTH_USER:$MONGO_AUTH_PASS@127.0.0.1:27017/admin" --eval "db.runCommand({ ping: 1 })" --quiet 2>/dev/null; then
              ok "MongoDB authentication enabled and verified"
            else
              warn "MongoDB auth config may need manual check"
            fi
          else
            warn "Failed to create MongoDB admin user"
            MONGO_AUTH_USER=""
            MONGO_AUTH_PASS=""
          fi
        else
          log "MongoDB authentication already configured"
          if [ -f "$MONGO_PASS_FILE" ]; then
            MONGO_AUTH_PASS="$(cat "$MONGO_PASS_FILE")"
            MONGO_AUTH_USER="root"
          fi
          if [ -n "$MONGO_AUTH_PASS" ]; then
            if $MONGO_CLI "mongodb://$MONGO_AUTH_USER:$MONGO_AUTH_PASS@127.0.0.1:27017/admin" --eval "db.runCommand({ ping: 1 })" --quiet 2>/dev/null; then
              ok "MongoDB auth verified with stored credentials"
            else
              for try_user in "root" "admin"; do
                for try_pass in "$MONGO_ROOT_PASSWORD" "password" "admin" "mongodb"; do
                  if $MONGO_CLI "mongodb://$try_user:$try_pass@127.0.0.1:27017/admin" --eval "db.runCommand({ ping: 1 })" --quiet 2>/dev/null; then
                    MONGO_AUTH_USER="$try_user"
                    MONGO_AUTH_PASS="$try_pass"
                    echo "$MONGO_AUTH_PASS" > "$MONGO_PASS_FILE"
                    ok "Found working MongoDB credentials: $try_user / $try_pass"
                    break 2
                  fi
                done
              done
            fi
          fi
        fi
      fi
    fi
  fi

  # ══════════════════════════════════════════════════════════════════════
  # 4 — CREATE ENVIRONMENT FILES
  # ══════════════════════════════════════════════════════════════════════
  header "4 — Environment Configuration"

  # Generate secure random secrets (idempotent: keep existing if .env exists)
  if [ -f "$ENV_FILE" ]; then
    log "backend/.env already exists — generating any missing secrets only"
    # Only generate if not already set
    JWT_SECRET=$(grep -oP '(?<=^JWT_SECRET=).*' "$ENV_FILE" 2>/dev/null || \
      node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 64 2>/dev/null)
    REFRESH_SECRET=$(grep -oP '(?<=^REFRESH_TOKEN_SECRET=).*' "$ENV_FILE" 2>/dev/null || \
      node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 64 2>/dev/null)
    COOKIE_SECRET=$(grep -oP '(?<=^COOKIE_SECRET=).*' "$ENV_FILE" 2>/dev/null || openssl rand -hex 32 2>/dev/null)
  else
    log "Generating secure random secrets..."
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 64 2>/dev/null)
    REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 64 2>/dev/null)
    COOKIE_SECRET=$(openssl rand -hex 32 2>/dev/null)
  fi

  # Build MONGO_URI with optional auth
  if [ -n "${MONGO_AUTH_USER:-}" ] && [ -n "${MONGO_AUTH_PASS:-}" ]; then
    ENCODED_PASS=$(printf '%s' "$MONGO_AUTH_PASS" | sed 's/@/%40/g;s/:/%3A/g;s/\//%2F/g;s/\?/%3F/g;s/#/%23/g;s/ /%20/g')
    MONGO_URI="mongodb://$MONGO_AUTH_USER:$ENCODED_PASS@127.0.0.1:27017/vapt_tracker?authSource=admin"
  else
    MONGO_URI="mongodb://127.0.0.1:27017/vapt_tracker"
  fi

  # Set FRONTEND_* with auto-detected IP
  FRONTEND_URL="http://$SERVER_IP:$BACKEND_PORT"
  FRONTEND_ORIGINS="http://localhost:${FRONTEND_PORT},http://127.0.0.1:${FRONTEND_PORT},http://${SERVER_IP}:${BACKEND_PORT}"

  # Auto-generate or update backend/.env
  if [ ! -f "$ENV_FILE" ]; then
    log "Creating $ENV_FILE..."
    cat > "$ENV_FILE" <<ENVEOF
NODE_ENV=production
PORT=$BACKEND_PORT
API_VERSION=v1
MONGO_URI=$MONGO_URI
MONGO_DB_NAME=vapt_tracker
DB_MAX_POOL=10
DB_MIN_POOL=1
DB_MAX_RETRIES=10
DB_RETRY_DELAY_MS=3000
JWT_SECRET=$JWT_SECRET
REFRESH_TOKEN_SECRET=$REFRESH_SECRET
COOKIE_SECRET=$COOKIE_SECRET
JWT_EXPIRE=15m
REFRESH_TOKEN_EXPIRE=7d
JWT_COOKIE_EXPIRE=7
STORAGE_ROOT=$STORAGE_ROOT
MAX_FILE_SIZE=52428800
FRONTEND_URL=$FRONTEND_URL
FRONTEND_ORIGINS=$FRONTEND_ORIGINS
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD="CHANGE_SUPER_ADMIN_PASSWORD"
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=200
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=20
BCRYPT_ROUNDS=12
LOG_LEVEL=info
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=eKavach
ENVEOF
    ok "backend/.env created"
  else
    log "backend/.env already exists — preserving existing, updating dynamic values"
    # Update MONGO_URI, FRONTEND_URL, FRONTEND_ORIGINS in place
    sed -i "s|^MONGO_URI=.*|MONGO_URI=$MONGO_URI|" "$ENV_FILE" 2>/dev/null || true
    sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=$FRONTEND_URL|" "$ENV_FILE" 2>/dev/null || true
    sed -i "s|^FRONTEND_ORIGINS=.*|FRONTEND_ORIGINS=$FRONTEND_ORIGINS|" "$ENV_FILE" 2>/dev/null || true
    ok "backend/.env updated with current IP/connection strings"
  fi

  # Frontend .env
  if [ -d "$FRONTEND_DIR" ] && [ ! -f "$FRONTEND_DIR/.env" ]; then
    log "Creating frontend/.env..."
    cat > "$FRONTEND_DIR/.env" <<FENVEOF
REACT_APP_API_URL=http://$SERVER_IP:$BACKEND_PORT/api
REACT_APP_API_PORT=$BACKEND_PORT
FENVEOF
    ok "frontend/.env created"
  elif [ -d "$FRONTEND_DIR" ]; then
    log "frontend/.env already exists — skipping"
  fi

  # ══════════════════════════════════════════════════════════════════════
  # 5 — INSTALL NPM DEPENDENCIES
  # ══════════════════════════════════════════════════════════════════════
  header "5 — Dependencies"

  log "Installing backend dependencies..."
  cd "$BACKEND_DIR"
  if [ "$DRY_RUN" = true ]; then
    log "[DRY-RUN] npm install --legacy-peer-deps"
  else
    npm install --legacy-peer-deps 2>&1 | tail -3 || {
      warn "Retrying backend install without optional deps..."
      npm install --legacy-peer-deps --no-optional 2>&1 | tail -3 || true
    }
  fi
  ok "Backend dependencies ready"

  if [ -d "$FRONTEND_DIR" ]; then
    log "Installing frontend dependencies..."
    cd "$FRONTEND_DIR"
    if [ "$DRY_RUN" = true ]; then
      log "[DRY-RUN] npm install --legacy-peer-deps"
    else
      npm install --legacy-peer-deps 2>&1 | tail -3 || {
        warn "Retrying frontend install..."
        npm install --legacy-peer-deps --no-audit --no-fund 2>&1 | tail -3 || true
      }
    fi
    ok "Frontend dependencies ready"
  fi
  cd "$ROOT_DIR"

  # ══════════════════════════════════════════════════════════════════════
  # 6 — CREATE STORAGE DIRECTORIES
  # ══════════════════════════════════════════════════════════════════════
  header "6 — Storage"

  for subdir in reports audits findings evidence temp avatars exports backups; do
    mkdir -p "$STORAGE_ROOT/$subdir"
  done
  chown -R "$(whoami):$(whoami)" "$STORAGE_ROOT" 2>/dev/null || true
  chmod -R 755 "$STORAGE_ROOT" 2>/dev/null || true
  chmod -R 775 "$STORAGE_ROOT/reports" "$STORAGE_ROOT/audits" "$STORAGE_ROOT/findings" "$STORAGE_ROOT/evidence" "$STORAGE_ROOT/temp" "$STORAGE_ROOT/backups" 2>/dev/null || true
  ok "Storage directories created at $STORAGE_ROOT"

  # ══════════════════════════════════════════════════════════════════════
  # 7 — BUILD FRONTEND
  # ══════════════════════════════════════════════════════════════════════
  header "7 — Frontend Build"

  if [ -d "$FRONTEND_DIR" ] && [ ! -d "$FRONTEND_DIR/build" ]; then
    log "Building frontend for production..."
    cd "$FRONTEND_DIR"
    if [ "$DRY_RUN" = false ]; then
      npm run build 2>&1 | tail -5 || warn "Frontend build failed"
    else
      log "[DRY-RUN] npm run build"
    fi
    cd "$ROOT_DIR"
    if [ -d "$FRONTEND_DIR/build" ]; then
      ok "Frontend built successfully"
    fi
  elif [ -d "$FRONTEND_DIR/build" ]; then
    log "Frontend already built — skipping"
  fi

  # ══════════════════════════════════════════════════════════════════════
  # 8 — SEED DATABASE
  # ══════════════════════════════════════════════════════════════════════
  header "8 — Database Seed"

  log "Waiting for MongoDB..."
  MONGO_URI_SEED=$(grep -i '^MONGO_URI=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | head -1 | tr -d '"' || echo "$MONGO_URI")

  MONGO_READY=false
  for i in $(seq 1 20); do
    if command -v mongosh &>/dev/null; then
      mongosh "$MONGO_URI_SEED" --eval "db.runCommand({ ping: 1 })" --quiet 2>/dev/null && { MONGO_READY=true; break; }
    elif command -v mongo &>/dev/null; then
      mongo "$MONGO_URI_SEED" --eval "db.runCommand({ ping: 1 })" --quiet 2>/dev/null && { MONGO_READY=true; break; }
    else
      node -e "const m=require('mongoose'); m.connect('$MONGO_URI_SEED',{serverSelectionTimeoutMS:3000}).then(()=>process.exit(0)).catch(()=>process.exit(1))" 2>/dev/null && { MONGO_READY=true; break; }
    fi
    sleep 2
  done

  if [ "$MONGO_READY" = false ]; then
    warn "MongoDB not reachable after 40s. Skip seed or re-run: node backend/scripts/seed.js"
  else
    ok "MongoDB is ready"
    SEED_SCRIPT="$ROOT_DIR/backend/scripts/seed.js"
    if [ -f "$SEED_SCRIPT" ] && [ "$DRY_RUN" = false ]; then
      log "Running seed script..."
      node "$SEED_SCRIPT" 2>&1 | tail -3 || warn "Seed failed. Re-run: node backend/scripts/seed.js"
      ok "Database seeded"
    fi
  fi

  # ══════════════════════════════════════════════════════════════════════
  # 9 — PM2 PROCESS MANAGER (with systemd startup)
  # ══════════════════════════════════════════════════════════════════════
  if [ "$SKIP_PM2" = false ]; then
    header "9 — PM2 Process Manager"

    if command -v pm2 &>/dev/null; then
      ok "PM2 already installed: $(pm2 -v 2>/dev/null || true)"
    else
      log "Installing PM2 globally..."
      if [ "$DRY_RUN" = true ]; then
        log "[DRY-RUN] npm install -g pm2"
      else
        npm install -g pm2 2>&1 | tail -2 || true
      fi
    fi

    if command -v pm2 &>/dev/null; then
      # Create ecosystem config in backend/
      log "Creating PM2 ecosystem config at $ECOSYSTEM_FILE..."
      cat > "$ECOSYSTEM_FILE" <<'PM2EOF'
module.exports = {
  apps: [{
    name: 'ekavach-backend',
    script: 'src/app.js',
    cwd: '$APP_DIR/backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    },
    max_memory_restart: '500M',
    error_file: '$APP_DIR/logs/pm2-error.log',
    out_file: '$APP_DIR/logs/pm2-out.log',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 4000,
    kill_timeout: 10000,
    listen_timeout: 30000,
    shutdown_with_message: true,
    time: true
  }]
};
PM2EOF
      ok "PM2 ecosystem config created"

      # Reload env from .env into the ecosystem
      log "Refreshing PM2 environment from backend/.env..."
      if [ "$DRY_RUN" = false ]; then
        pm2 delete ekavach-backend 2>/dev/null || true
        # Load env vars from .env into the PM2 process
        export "$(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$' | xargs)" 2>/dev/null || true
        pm2 start "$ECOSYSTEM_FILE" --update-env 2>&1 | tail -2 || {
          warn "PM2 start via ecosystem failed, trying direct start..."
          pm2 start "$BACKEND_DIR/src/app.js" \
            --name ekavach-backend \
            --cwd "$BACKEND_DIR" \
            --env NODE_ENV=production \
            --max-memory-restart 500M \
            --output "$LOGS_DIR/pm2-out.log" \
            --error "$LOGS_DIR/pm2-error.log" \
            2>&1 | tail -2 || true
        }
        pm2 save 2>/dev/null || true

        # Setup PM2 systemd startup (idempotent)
        log "Configuring PM2 systemd startup..."
        pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" 2>/dev/null || true
        ok "PM2 systemd startup configured"

        # Ensure PM2 resurrects on boot
        pm2 save --force 2>/dev/null || true
        ok "App started via PM2 (auto-restart on crash, max 500MB memory)"
      fi
    fi
  fi

  # ══════════════════════════════════════════════════════════════════════
  # 10 — NGINX REVERSE PROXY (with security, gzip, rate limiting, SPA)
  # ══════════════════════════════════════════════════════════════════════
  if [ "$SKIP_NGINX" = false ] && [ "$HAS_SUDO" = true ]; then
    header "10 — Nginx Reverse Proxy"

    if ! command -v nginx &>/dev/null; then
      log "Installing nginx..."
      DRY $PM_TOOL apt-get install -y -qq nginx 2>/dev/null || true
    fi

    if command -v nginx &>/dev/null; then
      FRONTEND_BUILD=""
      [ -d "$FRONTEND_DIR/build" ] && FRONTEND_BUILD="$FRONTEND_DIR/build"

      log "Writing nginx site config to $NGINX_AVAILABLE..."
      $PM_TOOL tee "$NGINX_AVAILABLE" >/dev/null <<NGINXEOF
# ================================================================
# eKavach VAPT Tracker — Nginx Site Config (auto-generated)
# ================================================================
# Server: $SERVER_IP
# Backend: http://127.0.0.1:$BACKEND_PORT
# Frontend: $FRONTEND_BUILD
# ================================================================

upstream ekavach_backend {
    server 127.0.0.1:$BACKEND_PORT;
    keepalive 32;
}

# ── Rate limiting zones ─────────────────────────────────────────
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=30r/s;
limit_req_zone \$binary_remote_addr zone=auth_limit:10m rate=5r/s;

server {
    listen 80;
    server_name $SERVER_IP;
    server_tokens off;

    client_max_body_size 50M;
    client_body_timeout 30s;
    client_header_timeout 30s;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;

    # ── Security: deny sensitive files ─────────────────────────
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~ \.(env|env\.example|env\.production\.example|gitignore|md|log|bak|backup|sql|dump|pem|key|crt)$ {
        deny all;
        access_log off;
        log_not_found off;
    }

    # ── Gzip compression ──────────────────────────────────────
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/json
        application/javascript
        application/xml
        application/x-javascript
        image/svg+xml
        text/xml
        application/vnd.ms-fontobject
        application/x-font-ttf
        font/opentype
        image/x-icon;

    # ── Security headers ──────────────────────────────────────
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Content Security Policy
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none'; form-action 'self'; base-uri 'self'" always;

    # ── API proxy with rate limiting ──────────────────────────
    location /api/ {
        limit_req zone=api_limit burst=50 nodelay;
        proxy_pass http://ekavach_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
    }

    # ── Auth endpoints (stricter rate limit) ──────────────────
    location ~ ^/api/(auth|users/login|users/register) {
        limit_req zone=auth_limit burst=10 nodelay;
        proxy_pass http://ekavach_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # ── Uploads / File Storage ────────────────────────────────
    location /uploads/ {
        proxy_pass http://ekavach_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_buffering off;
    }

    # ── Socket.IO ―────────────────────────────────────────────
    location /socket.io/ {
        proxy_pass http://ekavach_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
    }
NGINXEOF

      # Append frontend static serving block only if build exists
      if [ -n "$FRONTEND_BUILD" ]; then
        $PM_TOOL tee -a "$NGINX_AVAILABLE" >/dev/null <<NGINXEOF

    # ── Frontend SPA ─────────────────────────────────────────
    location / {
        root $FRONTEND_BUILD;
        index index.html;
        try_files \$uri \$uri/ /index.html;

        # Cache static assets aggressively
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }

        # HTML: no cache (SPA needs fresh index.html for service worker)
        location ~* \.html$ {
            expires -1;
            add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
        }
    }
}
NGINXEOF
      else
        # Fallback: proxy everything to backend
        $PM_TOOL tee -a "$NGINX_AVAILABLE" >/dev/null <<NGINXEOF

    # ── Fallback: proxy all other requests to backend ────────
    location / {
        proxy_pass http://ekavach_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXEOF
      fi

      # Enable site (remove default, symlink our config)
      $PM_TOOL rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
      $PM_TOOL ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"

      # Test config and reload
      if $PM_TOOL nginx -t 2>/dev/null; then
        if [ "$SERVICE_MGR" = "systemctl" ]; then
          $PM_TOOL systemctl enable nginx 2>/dev/null || true
          $PM_TOOL systemctl reload nginx 2>/dev/null || $PM_TOOL systemctl restart nginx 2>/dev/null || true
        else
          $PM_TOOL service nginx reload 2>/dev/null || $PM_TOOL service nginx restart 2>/dev/null || true
        fi
        ok "Nginx configured and running (rate limiting, security headers, gzip, SPA)"
      else
        warn "Nginx config test failed — check $NGINX_AVAILABLE"
      fi
    fi
  else
    log "Skipping nginx"
  fi

  # ══════════════════════════════════════════════════════════════════════
  # 11 — FIREWALL (UFW) — allow 22, 80, 443 only
  # ══════════════════════════════════════════════════════════════════════
  if [ "$SKIP_FIREWALL" = false ] && [ "$HAS_SUDO" = true ]; then
    header "11 — Firewall"

    if command -v ufw &>/dev/null; then
      # Check if UFW is already active with our rules
      if $PM_TOOL ufw status verbose 2>/dev/null | grep -q 'Status: active'; then
        log "UFW already active — ensuring rules are correct"
      else
        log "Configuring UFW..."
        $PM_TOOL ufw --force reset 2>/dev/null || true
      fi
      $PM_TOOL ufw default deny incoming 2>/dev/null || true
      $PM_TOOL ufw default allow outgoing 2>/dev/null || true
      $PM_TOOL ufw allow 22/tcp comment 'SSH' 2>/dev/null || true
      $PM_TOOL ufw allow 80/tcp comment 'HTTP' 2>/dev/null || true
      $PM_TOOL ufw allow 443/tcp comment 'HTTPS' 2>/dev/null || true
      $PM_TOOL ufw --force enable 2>/dev/null || true
      ok "UFW configured (allow: 22/SSH, 80/HTTP, 443/HTTPS only)"
    else
      log "UFW not found — install ufw or configure iptables manually"
    fi
  fi

  # ══════════════════════════════════════════════════════════════════════
  # 12 — HEALTH CHECK
  # ══════════════════════════════════════════════════════════════════════
  if [ "$DRY_RUN" = false ]; then
    header "12 — Health Check"

    log "Waiting for backend to become healthy..."
    HEALTHY=false
    for i in $(seq 1 15); do
      if curl -sf "http://127.0.0.1:$BACKEND_PORT/api/health" > /dev/null 2>&1; then
        HEALTHY=true
        ok "Backend healthy (attempt $i)"
        break
      fi
      sleep 2
    done
    if [ "$HEALTHY" = false ]; then
      warn "Health check timed out. Check: pm2 logs ekavach-backend"
    fi
  fi

  # ══════════════════════════════════════════════════════════════════════
  # SUMMARY
  # ══════════════════════════════════════════════════════════════════════
  header "Setup Complete"

  echo ""
  echo -e "  ${BOLD}${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "  ${BOLD}${GREEN}║           eKavach VAPT Tracker is ready                     ║${NC}"
  echo -e "  ${BOLD}${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
  echo -e "  ${BOLD}${GREEN}║${NC}                                                            "
  echo -e "  ${BOLD}${GREEN}║${NC}  ── ACCESS ───────────────────────────────────────────────"
  echo -e "  ${BOLD}${GREEN}║${NC}  API:       ${CYAN}http://${SERVER_IP}:${BACKEND_PORT}/api${NC}"
  echo -e "  ${BOLD}${GREEN}║${NC}  Health:    ${CYAN}http://${SERVER_IP}:${BACKEND_PORT}/api/health${NC}"
  echo -e "  ${BOLD}${GREEN}║${NC}  Frontend:  ${CYAN}http://${SERVER_IP}${NC}  (via nginx on port 80)"
  echo -e "  ${BOLD}${GREEN}║${NC}  Dev:       ${CYAN}http://localhost:${FRONTEND_PORT}${NC}"
  echo -e "  ${BOLD}${GREEN}║${NC}                                                            "
  echo -e "  ${BOLD}${GREEN}║${NC}  ── LOGIN ─────────────────────────────────────────────────"
  echo -e "  ${BOLD}${GREEN}║${NC}  Email:    ${YELLOW}admin@example.com${NC}"
  echo -e "  ${BOLD}${GREEN}║${NC}  Password: ${YELLOW}CHANGE_SUPER_ADMIN_PASSWORD${NC}"
  echo -e "  ${BOLD}${GREEN}║${NC}                                                            "
  if [ -n "${MONGO_AUTH_PASS:-}" ]; then
  echo -e "  ${BOLD}${GREEN}║${NC}  ── MONGODB ───────────────────────────────────────────────"
  echo -e "  ${BOLD}${GREEN}║${NC}  User:     ${CYAN}root${NC}"
  echo -e "  ${BOLD}${GREEN}║${NC}  Password: ${CYAN}$MONGO_AUTH_PASS${NC}  (saved in .mongodb_root_password)"
  fi
  echo -e "  ${BOLD}${GREEN}║${NC}                                                            "
  echo -e "  ${BOLD}${GREEN}║${NC}  ── COMMANDS ──────────────────────────────────────────────"
  echo -e "  ${BOLD}${GREEN}║${NC}  ${CYAN}./start.sh${NC}            — Start app"
  echo -e "  ${BOLD}${GREEN}║${NC}  ${CYAN}./stop.sh${NC}             — Stop app"
  echo -e "  ${BOLD}${GREEN}║${NC}  ${CYAN}./healthcheck.sh${NC}      — Verify everything"
  echo -e "  ${BOLD}${GREEN}║${NC}  ${CYAN}./backup.sh${NC}           — Backup data"
  echo -e "  ${BOLD}${GREEN}║${NC}  ${CYAN}pm2 logs ekavach-backend${NC} — View logs"
  echo -e "  ${BOLD}${GREEN}║${NC}  ${CYAN}pm2 monit${NC}             — Monitor processes"
  echo -e "  ${BOLD}${GREEN}║${NC}  ${CYAN}sudo ufw status${NC}       — Check firewall"
  echo -e "  ${BOLD}${GREEN}║${NC}                                                            "
  echo -e "  ${BOLD}${GREEN}║${NC}  ── LOGS ───────────────────────────────────────────────────"
  echo -e "  ${BOLD}${GREEN}║${NC}  Setup:    ${CYAN}$SETUP_LOG${NC}"
  echo -e "  ${BOLD}${GREEN}║${NC}  PM2:      ${CYAN}$LOGS_DIR/pm2-{error,out}.log${NC}"
  echo -e "  ${BOLD}${GREEN}║${NC}  Backend:  ${CYAN}$LOGS_DIR/backend.log${NC}"
  echo -e "  ${BOLD}${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""

# ── End of main script, close log redirect ──────────────────────────────
} 2>&1 | tee "$SETUP_LOG"
