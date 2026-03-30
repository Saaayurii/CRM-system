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
for arg in "$@"; do
  case $arg in
    --no-build) NO_BUILD=true ;;
    --pull)     PULL=true ;;
    --ssl)      SSL=true ;;
  esac
done

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

# ── Build ────────────────────────────────────────────────────
if [ "$PULL" = true ]; then
  info "Pulling latest base images..."
  docker compose pull --ignore-pull-failures 2>/dev/null || true
fi

if [ "$NO_BUILD" = false ]; then
  info "Building Docker images (this may take a while)..."
  docker compose build
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
