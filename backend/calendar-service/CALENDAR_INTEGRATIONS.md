# Calendar Module — внешние интеграции

## Архитектура

```
                                      ┌─── tasks-service (deadlines)
                                      ├─── inspections-service (scheduled_date)
  ┌──────────────┐   /calendar-feed   ├─── hr-service (time_off, attendance)
  │   Frontend   │ ──────────────────►├─── projects-service (start/end)
  │ FullCalendar │                    └─── calendar_events (manual + external)
  └──────────────┘
         │  /calendar-integrations/google/auth-url
         ▼
   accounts.google.com    ─── OAuth ───►   GOOGLE_REDIRECT_URI
                                              │
                                              ▼
                                  calendar-service: stores tokens
                                              │
                                              ▼
                            Google Calendar API ↔ calendar_events
                            (push/pull, syncToken, watch channels)

   Yandex / Apple: app-password → CalDAV (tsdav) → calendar_events
```

## Что добавлено

### БД (`database/migrations/calendar_integrations_and_extensions.sql`)
- Расширения `calendar_events`: `source_type`, `source_id`, `external_id`,
  `external_provider`, `external_etag`, `integration_id`, `color_hex`,
  `visibility`, `user_id`, `synced_at`, `custom_type_id`, `extra`.
- Таблица `calendar_custom_event_types` — кастомные типы (вариативность).
- Таблица `calendar_integrations` — OAuth/CalDAV токены per-user.

### Backend модули в `calendar-service`
- `calendar-events` — обычный CRUD (старый).
- `custom-event-types` — кастомные типы событий.
- `calendar-feed` — `GET /calendar-feed?start&end&sources=` агрегирует события
  из tasks/inspections/HR/projects + локальные.
- `calendar-integrations` — OAuth Google и CalDAV (Yandex/Apple).

### Провайдеры
- `providers/google.provider.ts` — OAuth 2.0 + Calendar API v3,
  инкрементальная синхронизация через `syncToken`, push/pull/delete.
- `providers/caldav.provider.ts` — через `tsdav`, ICS-парсинг,
  Yandex (`caldav.yandex.ru`) / Apple (`caldav.icloud.com`).

### Frontend
- `components/calendar/UnifiedCalendar.tsx` — общий компонент на FullCalendar.
- `components/calendar/EventEditorModal.tsx` — редактор события с RRULE и кастомными типами.
- Страницы:
  - `/dashboard/calendar` (общая)
  - `/dashboard/pm/calendar`
  - `/dashboard/inspector/calendar`
  - `/dashboard/hr/calendar`
  - `/dashboard/worker/calendar`
  - `/dashboard/foreman/calendar`
  - `/dashboard/accountant/calendar`
  - `/dashboard/supplier/calendar`
  - `/dashboard/warehouse/calendar`
  - `/dashboard/settings/calendar-integrations` (подключение)
- Пункт меню «Календарь» в `Sidebar.tsx` (role-aware).

## Развёртывание

```bash
# 1. SQL миграция
docker exec -i crm-postgres psql -U postgres -d construction_crm \
  < /opt/crm-system/database/migrations/calendar_integrations_and_extensions.sql

# 2. Установить зависимости calendar-service
cd backend/calendar-service && npm install
# (добавлены @nestjs/axios, axios, tsdav)

# 3. Перегенерация Prisma + rebuild
npx prisma generate
docker compose build calendar-service api-gateway && docker compose up -d

# 4. Frontend
cd frontend && npm install
# (добавлены @fullcalendar/*, rrule)
npm run build
```

## Переменные окружения

```
# В .env api-gateway / calendar-service
CALENDAR_ENC_KEY=<random 32+ chars>     # ключ для шифрования CalDAV паролей

GOOGLE_CLIENT_ID=<from Google Cloud>
GOOGLE_CLIENT_SECRET=<from Google Cloud>
GOOGLE_REDIRECT_URI=https://<домен>/api/v1/calendar-integrations/google/callback

FRONTEND_URL=https://<домен фронта>
```

В Google Cloud Console → APIs & Services → Credentials → Create OAuth client → Web application.
Authorized redirect URI: `https://<домен>/api/v1/calendar-integrations/google/callback`.
Включите Google Calendar API.

## Подключение пользователем

- **Google**: на странице `/dashboard/settings/calendar-integrations`
  → «Google Calendar» → редирект в Google → согласие → возврат.
- **Яндекс**: id.yandex.ru → Пароли приложений → CalDAV → ввести логин/пароль приложения.
- **Apple**: appleid.apple.com → Sign-In and Security → App-Specific Password.

После подключения нажмите «Синхронизировать», чтобы импортировать события.
Дальше — двусторонняя синхронизация (для Google — через syncToken,
для CalDAV — через etag сравнение и polling).

## Источники событий feed

| sourceType    | Откуда                              | Editable |
|---------------|-------------------------------------|----------|
| manual        | calendar_events (вручную)           | ✓        |
| task          | tasks.dueDate                       | ✕ (deep-link) |
| inspection    | inspections.scheduledDate           | ✕        |
| time_off      | hr.time_off                         | ✕        |
| attendance    | hr.attendance                       | ✕        |
| project       | projects.startDate/endDate          | ✕        |
| external_google | calendar_events (импорт)          | ✓ (sync обратно) |
| external_yandex | calendar_events (импорт)          | ✓        |
| external_apple  | calendar_events (импорт)          | ✓        |
