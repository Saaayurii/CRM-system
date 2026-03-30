# Construction CRM

Система управления строительными проектами — монорепозиторий с микросервисной архитектурой.

## Стек технологий

| Слой | Технологии |
|------|-----------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, Zustand |
| Backend | 23 NestJS микросервиса + API Gateway |
| База данных | PostgreSQL 15, Redis 7 |
| ORM | Prisma 6 |
| Инфраструктура | Docker, Docker Compose |

## Быстрый старт

### Требования

- Docker + Docker Compose
- Node.js 20+

### 1. Клонировать репозиторий

```bash
git clone <repo-url>
cd CRM-system
```

### 2. Настроить переменные окружения

```bash
cp backend/api-gateway/.env.example backend/api-gateway/.env
```

Ключевые переменные:

```env
# Домен приложения (для URL загруженных файлов)
APP_PUBLIC_URL=https://your-domain.com

# JWT (должен совпадать в auth-service и api-gateway)
JWT_ACCESS_SECRET=change-this-secret

# CORS (адрес фронтенда)
CORS_ORIGIN=http://localhost:3030
```

### 3. Запустить все сервисы

```bash
cd backend
docker compose up -d
```

Поднимает: PostgreSQL, Redis, 23 микросервиса, PgAdmin (5050), Redis Commander (8081).

### 4. Запустить фронтенд

```bash
cd frontend
npm install
npm run dev
```

Приложение доступно на [http://localhost:3030](http://localhost:3030)

---

## Структура проекта

```
CRM-system/
├── frontend/               # Next.js приложение (порт 3030)
│   ├── app/                # App Router страницы
│   ├── components/         # UI компоненты
│   ├── stores/             # Zustand сторы
│   └── lib/                # API клиент, утилиты
├── backend/                # Микросервисы
│   ├── api-gateway/        # Точка входа (порт 3000)
│   ├── auth-service/       # JWT аутентификация (3001)
│   ├── users-service/      # Пользователи, команды (3002)
│   ├── projects-service/   # Проекты, стройплощадки (3003)
│   ├── tasks-service/      # Задачи (3004)
│   ├── materials-service/  # Материалы (3005)
│   ├── suppliers-service/  # Поставщики (3006)
│   ├── finance-service/    # Финансы, бюджеты (3007)
│   ├── inspections-service/# Контроль качества (3008)
│   ├── hr-service/         # HR, зарплаты (3009)
│   ├── notifications-service/ # Уведомления Email/SMS (3010)
│   ├── chat-service/       # WebSocket чат (3011)
│   ├── calendar-service/   # Календарь (3012)
│   ├── equipment-service/  # Оборудование (3013)
│   ├── documents-service/  # Документы (3014)
│   ├── reports-service/    # Отчёты и аналитика (3015)
│   ├── dictionary-service/ # Справочники (3016)
│   ├── audit-service/      # Аудит действий (3017)
│   ├── clients-service/    # Клиенты (3018)
│   ├── wiki-service/       # База знаний (3019)
│   ├── training-service/   # Обучение сотрудников (3020)
│   ├── automation-service/ # Автоматизация (3021)
│   ├── settings-service/   # Настройки системы (3022)
│   ├── dashboard-service/  # Агрегация дашборда (3023)
│   └── docker-compose.yml
└── database/
    ├── CRM.sql             # Схема БД (50+ таблиц)
    └── seeds.sql           # Начальные данные
```

## Архитектура

```
Browser / Mobile
      │
      ▼
  Next.js :3030
  ├── /api/v1/*  ──► API Gateway :3000 ──► микросервисы
  ├── /uploads/* ──► API Gateway :3000     (статика файлов)
  └── /socket.io ──► Chat Service :3011    (WebSocket)
                                │
                         PostgreSQL :5432
                         Redis      :6379
```

Все запросы идут через **API Gateway**, который валидирует JWT и проксирует в нужный сервис.

## Роли пользователей

| ID | Код | Название |
|----|-----|----------|
| 1 | super_admin | Супер-администратор |
| 2 | admin | Администратор |
| 3 | hr_manager | HR Менеджер |
| 4 | project_manager | Менеджер проектов |
| 5 | foreman | Прораб |
| 6 | supplier_manager | Снабженец |
| 7 | warehouse_keeper | Кладовщик |
| 8 | accountant | Бухгалтер |
| 9 | inspector | Инспектор |
| 10 | worker | Рабочий |
| 11 | supplier | Поставщик |
| 12 | contractor | Подрядчик |
| 13 | observer | Наблюдатель |
| 14 | analyst | Аналитик |

## Команды разработки

### Тесты

```bash
cd backend/<service-name>
npm run test        # unit
npm run test:e2e    # e2e
```

### Prisma (после изменения схемы)

```bash
cd backend/<service-name>
npx prisma generate
npx prisma migrate dev
# Пересобрать образ:
docker compose build <service-name> && docker compose up -d <service-name>
```

### Docker

```bash
# Логи
docker compose logs -f api-gateway

# Пересобрать и перезапустить один сервис
docker compose build users-service && docker compose up -d users-service

# Остановить всё
docker compose down
```

## Деплой на сервер

### Через скрипт deploy.sh

```bash
# 1. Клонировать и перейти в проект
git clone <repo-url>
cd CRM-system

# 2. Создать .env из шаблона и заполнить секреты
cp .env.prod.example .env
nano .env
# Обязательно задать:
#   POSTGRES_PASSWORD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
#   DOMAIN, CERTBOT_EMAIL (если нужен SSL)

# 3. Деплой без SSL (HTTP)
./deploy.sh

# 3а. Деплой с SSL (Let's Encrypt, первый раз)
./deploy.sh --ssl

# Флаги:
#   --no-build   не пересобирать образы (быстрее при re-deploy)
#   --pull       обновить базовые образы node:20-alpine и т.д.
#   --ssl        получить SSL-сертификат через Certbot
```

После первого `--ssl` сертификат обновляется автоматически каждые 12 часов.

### Вручную через Docker Compose

```bash
# 1. Настроить переменные окружения
cp .env.prod.example .env && nano .env

# 2. Собрать все образы
docker compose build

# 3. Запустить весь стек
docker compose up -d

# 4. Проверить статус
docker compose ps
curl http://localhost/api/v1/health

# Логи
docker compose logs -f
docker compose logs -f api-gateway
```

### Проверка работоспособности

```bash
# Health check (Redis + Memory + Auth + Users сервисы)
curl http://localhost/api/v1/health

# Тестовый логин
curl -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crm.local","password":"Password123!"}'
```

### Бэкапы PostgreSQL

Контейнер `db-backup` делает дамп ежедневно в 03:00 в папку `./backups/`.
Хранит последние 7 дней. Вручную:

```bash
docker exec crm-db-backup pg_dump -h postgres -U postgres construction_crm | gzip > backup.sql.gz
```

---

## Инструменты администрирования

| Инструмент | URL | Доступ |
|-----------|-----|--------|
| PgAdmin | http://localhost:5050 | admin@crm.local / admin |
| Redis Commander | http://localhost:8081 | — |
| Swagger | http://localhost:3000/api/docs | — |
