#!/usr/bin/env bash
# =============================================================
# CRM System — Production Deploy Script
# Usage: ./deploy.sh [--no-build] [--pull] [--ssl]
#
#   --no-build  Skip Docker image build step
#   --pull      Pull latest base images before build
#   --ssl       Issue SSL certificate via Certbot (first deploy)
# =============================================================
set -euo pipefail

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ── Parse args ───────────────────────────────────────────────
NO_BUILD=false
PULL=false
SSL=false
# Auto «технические работы» на время деплоя (вкл в начале, выкл в конце).
# Отключить: DEPLOY_MAINTENANCE=false  или флаг --no-maintenance.
MAINTENANCE="${DEPLOY_MAINTENANCE:-true}"
for arg in "$@"; do
  case $arg in
    --no-build)       NO_BUILD=true ;;
    --pull)           PULL=true ;;
    --ssl)            SSL=true ;;
    --no-maintenance) MAINTENANCE=false ;;
  esac
done

# ── Maintenance toggle ────────────────────────────────────────
# Переключает accounts.settings.maintenance_mode для всех активных аккаунтов
# (источник истины фронта) и публикует SSE-событие подключённым клиентам, чтобы
# заглушка появлялась/снималась мгновенно, без перезагрузки. Не критично для
# самого деплоя: любые сбои здесь только предупреждают, но не валят процесс.
# ВАЖНО: при падении деплоя режим остаётся ВКЛючённым (пользователи не видят
# полусломанную систему) — снять можно тумблером супер-админа или ручным off.
maintenance_set() {
  local mode="$1"  # true | false
  [ "$MAINTENANCE" = true ] || return 0
  local pg=crm-postgres redis=crm-redis db=construction_crm
  if ! docker ps --format '{{.Names}}' | grep -q "^${pg}$"; then
    warn "Контейнер ${pg} не запущен — пропускаю maintenance=${mode}"
    return 0
  fi
  info "Устанавливаю maintenance_mode=${mode} для активных аккаунтов..."
  docker exec -i "$pg" psql -U postgres -d "$db" -v ON_ERROR_STOP=1 -c \
    "UPDATE accounts SET settings = jsonb_set(coalesce(settings,'{}'::jsonb), '{maintenance_mode}', '${mode}'::jsonb) WHERE status = 1;" \
    >/dev/null 2>&1 || { warn "Не удалось обновить maintenance в БД"; return 0; }
  # Мгновенный SSE-пуш уже подключённым клиентам
  local ids
  ids=$(docker exec "$pg" psql -U postgres -d "$db" -tAc "SELECT id FROM accounts WHERE status = 1;" 2>/dev/null || true)
  for id in $ids; do
    docker exec "$redis" redis-cli PUBLISH "crm:maintenance:${id}" \
      "{\"accountId\":${id},\"mode\":${mode},\"allowedRoles\":[]}" >/dev/null 2>&1 || true
  done
  info "maintenance_mode=${mode} применён."
}

# ── Pre-flight checks ─────────────────────────────────────────
info "Running pre-flight checks..."

if [ ! -f "docker-compose.yml" ]; then
  error "Must be run from the project root (where docker-compose.yml is located)"
  exit 1
fi

if [ ! -f ".env" ]; then
  error ".env file not found. Copy .env.prod.example and fill in secrets:"
  error "  cp .env.prod.example .env && nano .env"
  exit 1
fi

# Check for placeholder secrets
PLACEHOLDERS=(
  "change-me-in-production"
  "change-this-to-a-strong-random-secret"
)
for placeholder in "${PLACEHOLDERS[@]}"; do
  if grep -q "$placeholder" .env 2>/dev/null; then
    error "Found placeholder value in .env: '$placeholder'"
    error "Generate real secrets with:  openssl rand -hex 64"
    exit 1
  fi
done

# Check required vars
REQUIRED_VARS=(
  "POSTGRES_PASSWORD"
  "JWT_ACCESS_SECRET"
  "JWT_REFRESH_SECRET"
)
for var in "${REQUIRED_VARS[@]}"; do
  val=$(grep "^${var}=" .env | cut -d= -f2-)
  if [ -z "$val" ]; then
    error "Required variable $var is empty in .env"
    exit 1
  fi
done

# SSL mode requires DOMAIN and CERTBOT_EMAIL
if [ "$SSL" = true ]; then
  DOMAIN=$(grep "^DOMAIN=" .env | cut -d= -f2-)
  CERTBOT_EMAIL=$(grep "^CERTBOT_EMAIL=" .env | cut -d= -f2-)
  if [ -z "$DOMAIN" ]; then
    error "DOMAIN is not set in .env (required for --ssl)"
    exit 1
  fi
  if [ -z "$CERTBOT_EMAIL" ]; then
    error "CERTBOT_EMAIL is not set in .env (required for --ssl)"
    exit 1
  fi
fi

info "Pre-flight checks passed."

# ── Maintenance ON (пока старые контейнеры ещё живы — SSE долетит мгновенно) ──
maintenance_set true

# ── Cleanup stale Docker networks ────────────────────────────
info "Pruning unused Docker networks..."
docker network prune -f 2>/dev/null || true

# ── Build ────────────────────────────────────────────────────
if [ "$PULL" = true ]; then
  info "Pulling latest base images..."
  docker compose pull --ignore-pull-failures 2>/dev/null || true
fi

if [ "$NO_BUILD" = false ]; then
  ALL_SERVICES=$(docker compose config --services)
  BUILD_PARALLEL="${BUILD_PARALLEL:-4}"

  # Determine which services actually need rebuilding (only changed ones).
  # OLD_REF is the git HEAD captured by the CI workflow BEFORE `git pull`.
  HAVE_BASE=false
  CHANGED=""
  if [ -n "${OLD_REF:-}" ] && git rev-parse --verify -q "${OLD_REF}^{commit}" >/dev/null 2>&1; then
    CHANGED=$(git diff --name-only "$OLD_REF" HEAD 2>/dev/null || true)
    HAVE_BASE=true
  fi

  if [ "$HAVE_BASE" = false ]; then
    warn "No valid OLD_REF — rebuilding ALL services (safe fallback)."
    TO_BUILD="$ALL_SERVICES"
  elif echo "$CHANGED" | grep -qE '(^|/)docker-compose\.yml$'; then
    warn "docker-compose.yml changed — rebuilding ALL services."
    TO_BUILD="$ALL_SERVICES"
  else
    # A service is rebuilt if files under backend/<service>/ changed;
    # the frontend service if anything under frontend/ changed.
    TO_BUILD=$(echo "$ALL_SERVICES" | while read -r s; do
      if echo "$CHANGED" | grep -q "^backend/${s}/"; then echo "$s"
      elif [ "$s" = "frontend" ] && echo "$CHANGED" | grep -q "^frontend/"; then echo "$s"
      fi
    done)
  fi

  if [ -z "${TO_BUILD// /}" ]; then
    info "No service sources changed — skipping build step."
  else
    info "Building (parallel=${BUILD_PARALLEL}): $(echo $TO_BUILD | tr '\n' ' ')"
    echo "$TO_BUILD" | xargs -P "$BUILD_PARALLEL" -I {} \
      sh -c 'echo "[INFO] building {}..."; docker compose build {}'
  fi
fi

# ── SSL: First-time certificate issuance ─────────────────────
if [ "$SSL" = true ]; then
  DOMAIN=$(grep "^DOMAIN=" .env | cut -d= -f2-)
  CERTBOT_EMAIL=$(grep "^CERTBOT_EMAIL=" .env | cut -d= -f2-)

  # Patch nginx.conf to use the real domain
  sed -i "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" nginx.conf

  # Start only nginx (HTTP mode) so certbot can complete ACME challenge
  info "Starting nginx for ACME challenge..."
  docker compose up -d nginx

  # Wait for nginx to be ready
  sleep 5

  info "Requesting SSL certificate for ${DOMAIN}..."
  docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "${CERTBOT_EMAIL}" \
    --agree-tos \
    --no-eff-email \
    -d "${DOMAIN}"

  info "Certificate issued. Reloading nginx with HTTPS config..."
  docker compose exec nginx nginx -s reload
fi

# ── Deploy ───────────────────────────────────────────────────
info "Removing stale containers that conflict by container_name..."
grep "container_name:" docker-compose.yml | awk '{print $2}' | while read -r cname; do
  old_id=$(docker ps -a --filter "name=^/${cname}$" --format "{{.ID}}" 2>/dev/null)
  if [ -n "$old_id" ]; then
    warn "Removing stale container: ${cname} (${old_id})"
    docker rm -f "$old_id" 2>/dev/null || true
  fi
done

info "Starting services..."
docker compose up -d --remove-orphans

# ── Wait for postgres ─────────────────────────────────────────
info "Waiting for PostgreSQL to be healthy..."
timeout=60
elapsed=0
until docker compose exec -T postgres pg_isready -U postgres -q 2>/dev/null; do
  if [ $elapsed -ge $timeout ]; then
    error "PostgreSQL did not become healthy within ${timeout}s"
    docker compose logs postgres --tail=30
    exit 1
  fi
  sleep 2; elapsed=$((elapsed+2))
done
info "PostgreSQL is ready."

# ── Maintenance OFF (после готовности шлюза, чтобы SSE-выключение долетело) ──
if [ "$MAINTENANCE" = true ]; then
  info "Waiting for api-gateway before lifting maintenance..."
  gw_timeout=60; gw_elapsed=0
  until docker exec crm-api-gateway wget -q --spider http://localhost:3000/api/v1/health 2>/dev/null; do
    if [ $gw_elapsed -ge $gw_timeout ]; then
      warn "api-gateway не ответил за ${gw_timeout}s — снимаю maintenance всё равно (клиенты добьют поллингом)"
      break
    fi
    sleep 3; gw_elapsed=$((gw_elapsed+3))
  done
  maintenance_set false
fi

# ── Status ───────────────────────────────────────────────────
info "Deployment complete. Container status:"
docker compose ps

echo ""
if [ "$SSL" = true ]; then
  DOMAIN=$(grep "^DOMAIN=" .env | cut -d= -f2-)
  info "Application is available at: https://${DOMAIN}"
else
  info "Application is available at: http://localhost:${NGINX_PORT:-80}"
fi
info "Logs: docker compose logs -f"
