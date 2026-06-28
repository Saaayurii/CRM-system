#!/usr/bin/env bash
#
# Weekly PostgreSQL backup → REG.RU S3 (bucket crm-315).
#
# Dumps the prod DB from the crm-postgres container, gzips it, keeps a few local
# copies for fast restore, and uploads to s3://crm-315/backups/db/. Reuses the
# same AWS_S3_* credentials the app uses for uploads (read from backend/.env on
# the server — never committed).
#
# Install on the server (runs as a user with docker access):
#   crontab -e
#   # Sundays 03:17 (odd minute to avoid the top-of-hour cron stampede)
#   17 3 * * 0  /opt/crm-system/database/backups/pg_backup.sh >> /var/log/crm-pg-backup.log 2>&1
#
# Manual run / first test:
#   /opt/crm-system/database/backups/pg_backup.sh
#
# Restore (DESTRUCTIVE — overwrites the DB):
#   gunzip -c construction_crm-YYYY-MM-DD.sql.gz \
#     | docker exec -i crm-postgres psql -U postgres -d construction_crm

set -euo pipefail

# ── Resolve paths ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/backend/.env}"
# Default dump dir sits under `backups/`, which the repo .gitignore already
# excludes everywhere — dumps never get committed by accident.
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/backups}"

# ── Config (overridable via env) ─────────────────────────────────────────────
PG_CONTAINER="${PG_CONTAINER:-crm-postgres}"
PG_USER="${PG_USER:-postgres}"
PG_DB="${PG_DB:-construction_crm}"
# Upload runs inside the gateway container: it already has @aws-sdk/client-s3,
# the AWS_S3_* env, and — crucially — a CA store that trusts s3.regru.cloud
# (REG.RU's chain isn't in aws-cli's certifi bundle → "self-signed in chain").
GATEWAY_CONTAINER="${GATEWAY_CONTAINER:-crm-api-gateway}"
LOCAL_RETENTION="${LOCAL_RETENTION:-8}"   # keep last N local dumps (~2 months weekly)
MIN_BYTES="${MIN_BYTES:-10240}"           # sanity floor: a real dump is > 10KB

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { log "ERROR: $*"; exit 1; }

# ── Load S3 credentials from backend/.env ────────────────────────────────────
[ -f "$ENV_FILE" ] || die "env file not found: $ENV_FILE"
# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a

# The actual upload reads AWS_S3_* from inside the gateway container; here we
# only sanity-check that backend/.env is populated (same source via compose).
S3_BUCKET="${AWS_S3_BUCKET_NAME:-crm-315}"
: "${AWS_S3_ACCESS_KEY_ID:?AWS_S3_ACCESS_KEY_ID missing in $ENV_FILE}"
: "${AWS_S3_SECRET_ACCESS_KEY:?AWS_S3_SECRET_ACCESS_KEY missing in $ENV_FILE}"

# ── Dump ─────────────────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"
STAMP="$(date '+%Y-%m-%d')"
FILE="${PG_DB}-${STAMP}.sql.gz"
DEST="$BACKUP_DIR/$FILE"

log "Dumping ${PG_DB} from container ${PG_CONTAINER} → ${DEST}"
# pg_dump exit status must survive the pipe (pipefail), or a failed dump that
# still produces a tiny gz would get uploaded.
docker exec "$PG_CONTAINER" pg_dump -U "$PG_USER" --no-owner --clean --if-exists "$PG_DB" \
  | gzip -9 > "$DEST"

SIZE=$(wc -c < "$DEST")
[ "$SIZE" -ge "$MIN_BYTES" ] || die "dump suspiciously small (${SIZE} bytes) — aborting upload"
log "Dump OK (${SIZE} bytes)"

# ── Upload to S3 via the gateway container ───────────────────────────────────
# Reuses the exact S3 path the app uses (same SDK, creds, and TLS trust), so we
# don't have to disable cert verification for a dump full of customer data.
log "Uploading to s3://${S3_BUCKET}/backups/db/${FILE} (via ${GATEWAY_CONTAINER})"
docker inspect -f '{{.State.Running}}' "$GATEWAY_CONTAINER" >/dev/null 2>&1 \
  || die "gateway container ${GATEWAY_CONTAINER} not running — cannot upload (local dump kept at $DEST)"

# Stream the dump into the container over stdin — no temp file inside it (the
# gateway runs as non-root, so a root-owned `docker cp` file couldn't be cleaned
# up), no docker cp, no rm.
docker exec -i -e BK_FILE="$FILE" "$GATEWAY_CONTAINER" node -e '
  const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
  const s3 = new S3Client({
    region: process.env.AWS_S3_REGION || "ru-1",
    endpoint: process.env.AWS_S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
    },
  });
  const chunks = [];
  process.stdin.on("data", (c) => chunks.push(c));
  process.stdin.on("end", () => {
    s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: "backups/db/" + process.env.BK_FILE,
      Body: Buffer.concat(chunks),
    })).then(() => console.log("uploaded"))
      .catch((e) => { console.error(e.message); process.exit(1); });
  });
' < "$DEST"
log "Upload OK"

# ── Rotate local copies ──────────────────────────────────────────────────────
log "Pruning local dumps, keeping newest ${LOCAL_RETENTION}"
ls -1t "$BACKUP_DIR"/${PG_DB}-*.sql.gz 2>/dev/null | tail -n +"$((LOCAL_RETENTION + 1))" | while read -r old; do
  log "  rm $(basename "$old")"
  rm -f "$old"
done

log "Backup complete: ${FILE}"
