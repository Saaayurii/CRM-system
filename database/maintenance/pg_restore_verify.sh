#!/usr/bin/env bash
#
# Restore-drill: proves the latest S3 backup actually restores.
#
# An untested backup is Schrödinger's backup. This downloads the newest dump
# from S3 (via the gateway container — same TLS trust as the app), restores it
# into a THROWAWAY database, runs sanity row-counts, then drops it. Prod data is
# never touched. Exits non-zero (and alerts super-admins) if anything fails.
#
# Run manually:
#   /opt/crm-system/database/maintenance/pg_restore_verify.sh
#
# Monthly cron (1st of month, 04:00):
#   0 4 1 * *  /opt/crm-system/database/maintenance/pg_restore_verify.sh >> /var/log/crm-pg-restore-verify.log 2>&1

set -euo pipefail

PG_CONTAINER="${PG_CONTAINER:-crm-postgres}"
PG_USER="${PG_USER:-postgres}"
GATEWAY_CONTAINER="${GATEWAY_CONTAINER:-crm-api-gateway}"
VERIFY_DB="${VERIFY_DB:-construction_crm_restore_check}"
ALERT_ACCOUNT_ID="${ALERT_ACCOUNT_ID:-1}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# Best-effort alert to super-admins (roleId 1) via notifications-service, routed
# through the gateway container (which sits on the docker network). Never fails.
notify_failure() {
  local msg="$1"
  docker exec -e MSG="$msg" -e ALERT_ACCOUNT_ID="$ALERT_ACCOUNT_ID" "$GATEWAY_CONTAINER" node -e '
    const url = (process.env.NOTIFICATIONS_SERVICE_URL || "http://notifications-service:3010")
      + "/notifications/internal/broadcast";
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: Number(process.env.ALERT_ACCOUNT_ID || 1),
        roleIds: [1],
        title: "⚠️ Проверка восстановления БД провалилась",
        message: process.env.MSG,
        notificationType: "error",
        priority: 3,
        channels: ["in_app", "push"],
      }),
      signal: AbortSignal.timeout(5000),
    }).then((r) => console.log("alert sent", r.status))
      .catch((e) => console.error("alert failed:", e.message));
  ' >/dev/null 2>&1 || true
}

TMPGZ=""
cleanup() {
  local rc=$?
  [ -n "$TMPGZ" ] && rm -f "$TMPGZ"
  # Always drop the throwaway DB, even on failure.
  docker exec "$PG_CONTAINER" psql -U "$PG_USER" -q \
    -c "DROP DATABASE IF EXISTS ${VERIFY_DB};" >/dev/null 2>&1 || true
  if [ "$rc" -ne 0 ]; then
    log "RESTORE VERIFY FAILED (rc=$rc)"
    notify_failure "Не удалось восстановить последний бэкап БД на $(hostname) ($(date '+%F %T')). Проверьте $0."
  fi
}
trap cleanup EXIT

docker inspect -f '{{.State.Running}}' "$GATEWAY_CONTAINER" >/dev/null 2>&1 \
  || { log "ERROR: gateway ${GATEWAY_CONTAINER} not running"; exit 1; }

# ── 1. Newest backup key in S3 (keys carry YYYY-MM-DD → lexical sort = chrono) ─
log "Finding latest backup in S3…"
LATEST_KEY="$(docker exec "$GATEWAY_CONTAINER" node -e '
  const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
  const s3 = new S3Client({
    region: process.env.AWS_S3_REGION || "ru-1",
    endpoint: process.env.AWS_S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
    },
  });
  s3.send(new ListObjectsV2Command({ Bucket: process.env.AWS_S3_BUCKET_NAME, Prefix: "backups/db/" }))
    .then((r) => {
      const keys = (r.Contents || []).map((o) => o.Key).filter((k) => k.endsWith(".sql.gz")).sort();
      if (!keys.length) { console.error("no backups found"); process.exit(2); }
      process.stdout.write(keys[keys.length - 1]);
    })
    .catch((e) => { console.error(e.message); process.exit(1); });
')"
[ -n "$LATEST_KEY" ] || { log "ERROR: no backup found in S3"; exit 2; }
log "Latest: ${LATEST_KEY}"

# ── 2. Download it (gateway GetObject → stdout → temp file) ───────────────────
TMPGZ="$(mktemp /tmp/crm-restore-verify.XXXXXX.sql.gz)"
docker exec -e BK_KEY="$LATEST_KEY" "$GATEWAY_CONTAINER" node -e '
  const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
  const s3 = new S3Client({
    region: process.env.AWS_S3_REGION || "ru-1",
    endpoint: process.env.AWS_S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
    },
  });
  s3.send(new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME, Key: process.env.BK_KEY }))
    .then((r) => {
      r.Body.pipe(process.stdout);
      r.Body.on("error", (e) => { console.error(e.message); process.exit(1); });
    })
    .catch((e) => { console.error(e.message); process.exit(1); });
' > "$TMPGZ"

# ── 3. gzip integrity ────────────────────────────────────────────────────────
gunzip -t "$TMPGZ" || { log "ERROR: downloaded dump is not a valid gzip"; exit 1; }
log "Downloaded + gzip OK ($(wc -c < "$TMPGZ") bytes)"

# ── 4. Restore into a throwaway DB ───────────────────────────────────────────
log "Restoring into throwaway DB ${VERIFY_DB}…"
docker exec "$PG_CONTAINER" psql -U "$PG_USER" -q -c "DROP DATABASE IF EXISTS ${VERIFY_DB};"
docker exec "$PG_CONTAINER" psql -U "$PG_USER" -q -c "CREATE DATABASE ${VERIFY_DB};"
# Dump uses --clean --if-exists, so DROPs on a fresh DB are harmless no-ops.
gunzip -c "$TMPGZ" | docker exec -i "$PG_CONTAINER" psql -U "$PG_USER" -d "${VERIFY_DB}" -q >/dev/null

# ── 5. Sanity counts — a real prod dump has accounts + users ─────────────────
count() { docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "${VERIFY_DB}" -tAc "SELECT count(*) FROM $1;" 2>/dev/null | tr -d '[:space:]'; }
ACC="$(count accounts || true)"
USR="$(count users || true)"
log "Row counts — accounts=${ACC:-?} users=${USR:-?}"

case "${ACC:-}" in ''|*[!0-9]*) log "ERROR: accounts not readable after restore"; exit 1;; esac
case "${USR:-}" in ''|*[!0-9]*) log "ERROR: users not readable after restore"; exit 1;; esac
[ "$ACC" -gt 0 ] && [ "$USR" -gt 0 ] || { log "ERROR: restored DB looks empty (accounts=$ACC users=$USR)"; exit 1; }

log "RESTORE VERIFY PASSED — ${LATEST_KEY} restores cleanly (accounts=$ACC, users=$USR)"
