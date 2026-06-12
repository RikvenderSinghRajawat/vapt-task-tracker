#!/usr/bin/env bash
# ===========================================================
# eKavach VAPT Tracker — Backup Script
# Backups: MongoDB database + storage files
# Usage:   sudo bash backup.sh [/path/to/backup/dir]
# ===========================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $1"; }
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${1:-$ROOT_DIR/storage/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/ekavach_backup_$TIMESTAMP"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

log "Starting eKavach backup..."
log "Backup destination: $BACKUP_DIR"

mkdir -p "$BACKUP_DIR"

# -- 1. Check MongoDB is available -----------------------------------
if ! command -v mongosh &>/dev/null && ! command -v mongo &>/dev/null; then
  fail "MongoDB CLI (mongosh or mongo) not found."
fi

MONGO_CLI="mongosh"
if ! command -v mongosh &>/dev/null; then
  MONGO_CLI="mongo"
fi

MONGO_URI="${MONGO_URI:-mongodb://127.0.0.1:27017/vapt_tracker}"

# -- 2. Export MongoDB collections to JSON ---------------------------
log "Backing up MongoDB collections..."
EXPORT_DIR="$BACKUP_DIR/mongodb"
mkdir -p "$EXPORT_DIR"

COLLECTIONS=$(echo "db.getCollectionNames()" | $MONGO_CLI "$MONGO_URI" --quiet 2>/dev/null | tr ',' '\n' | tr -d '[]" ' | grep -v '^$' || true)

if [ -z "$COLLECTIONS" ]; then
  COLLECTIONS="users projects findings milestones reports notifications auditlogs tasks reviewrequests quarterlyaudits taskcounters"
fi

for COLL in $COLLECTIONS; do
  $MONGO_CLI "$MONGO_URI" \
    --eval "db.getCollection('$COLL').find({}).toArray()" \
    --quiet 2>/dev/null \
    | python3 -c "import sys,json; data=eval(sys.stdin.read()); print(json.dumps(data, indent=2, default=str))" \
    > "$EXPORT_DIR/${COLL}.json" 2>/dev/null || {
    $MONGO_CLI "$MONGO_URI" \
      --eval "print(JSON.stringify(db.getCollection('$COLL').find({}).toArray(), null, 2))" \
      --quiet 2>/dev/null \
      > "$EXPORT_DIR/${COLL}.json" 2>/dev/null || true
  }
  if [ -s "$EXPORT_DIR/${COLL}.json" ]; then
    ok "  Exported collection: $COLL"
  fi
done

# -- 3. Backup storage files -----------------------------------------
log "Backing up storage files..."
STORAGE_DIR="$ROOT_DIR/storage"
if [ -d "$STORAGE_DIR" ]; then
  tar -czf "$BACKUP_DIR/storage.tar.gz" \
    -C "$ROOT_DIR" \
    --exclude="backups" \
    storage/
  ok "Storage files backed up"
fi

# -- 4. Create manifest ----------------------------------------------
cat > "$BACKUP_DIR/manifest.txt" <<EOF
eKavach VAPT Tracker Backup
Timestamp: $(date)
Source: $ROOT_DIR
Collections: $COLLECTIONS
MongoDB URI: $MONGO_URI
EOF

# -- 5. Compress backup ----------------------------------------------
log "Compressing backup..."
cd "$BACKUP_ROOT"
tar -czf "ekavach_backup_$TIMESTAMP.tar.gz" \
  -C "$BACKUP_ROOT" \
  "ekavach_backup_$TIMESTAMP"
rm -rf "$BACKUP_DIR"
ok "Backup created: $BACKUP_ROOT/ekavach_backup_$TIMESTAMP.tar.gz"

# -- 6. Cleanup old backups ------------------------------------------
log "Cleaning backups older than $RETENTION_DAYS days..."
find "$BACKUP_ROOT" -name "ekavach_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# -- 7. Summary -------------------------------------------------------
BACKUP_SIZE=$(du -h "$BACKUP_ROOT/ekavach_backup_$TIMESTAMP.tar.gz" | cut -f1)
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Backup Complete ✓                  ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  File:   ekavach_backup_$TIMESTAMP.tar.gz"
echo -e "${GREEN}║${NC}  Size:   $BACKUP_SIZE"
echo -e "${GREEN}║${NC}  Path:   $BACKUP_ROOT"
echo -e "${GREEN}║${NC}  Retention: $RETENTION_DAYS days"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
