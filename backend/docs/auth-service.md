# Auth Service (`port 3001`)

## Назначение
Отвечает за аутентификацию и авторизацию пользователей: регистрацию, вход, выход, ротацию JWT refresh-токенов, управление сессиями. Хранит refresh-токены и сессии в БД. Реализует многоаккаунтный вход (выбор компании), систему инвайтов для регистрации компаний, а также механизм заявок на регистрацию с одобрением/отклонением со стороны HR/Admin.

## Ключевые эндпоинты
- `POST /auth/register` — регистрация нового пользователя (публичный)
- `POST /auth/login` — вход по email/паролю, возвращает access+refresh токены
- `POST /auth/refresh` — обновление access-токена по refresh-токену
- `POST /auth/logout` — завершение текущей сессии
- `POST /auth/logout-all` — завершение всех сессий пользователя
- `GET  /auth/me` — данные текущего пользователя из JWT
- `GET  /auth/sessions` — список активных сессий
- `DELETE /auth/sessions/:id` — отзыв конкретной сессии
- `POST /auth/register-company` — регистрация новой компании с первым admin-пользователем
- `POST /auth/registration-requests` — подача заявки на вступление в компанию
- `PUT  /auth/registration-requests/:id/approve` — одобрение заявки (Admin/HR)
- `PUT  /auth/registration-requests/:id/reject` — отклонение заявки (Admin/HR)
- `POST /auth/invites` — создание инвайт-ссылки (Super Admin)
- `GET  /auth/invites/:token/check` — проверка инвайта (публичный)
- `POST /auth/portal/login` — вход клиента в клиентский портал по логину/паролю (публичный)
- `POST /auth/portal/magic` — вход клиента по одноразовому magic-токену (публичный)
- `POST /auth/password-reset/request` — запрос восстановления по email (публичный, всегда 200)
- `GET  /auth/password-reset/accounts?token=` — список аккаунтов под токеном для выбора (публичный)
- `POST /auth/password-reset/confirm` — установка нового пароля для выбранных аккаунтов (публичный)
- `GET  /auth/account-recovery-log` — журнал «кто восстановил аккаунт» по компании (Admin/Super Admin)

## Модели данных (Prisma)
- `User` — пользователь системы (email, passwordHash, roleId, accountId)
- `Account` — тенант/компания
- `RefreshToken` — хранение refresh-токенов с привязкой к сессии
- `UserSession` — активные сессии (userAgent, ipAddress, lastActivity)
- `RegistrationRequest` — заявки на регистрацию со статусом pending/approved/rejected
- `CompanyInvite` — одноразовые инвайт-токены для регистрации компании
- `PasswordResetToken` — токен восстановления по email (sha256-хеш, один на email, TTL 60 мин)
- `AccountRecoveryLog` — аудит восстановлений, изолирован по `accountId`, поле `method` (email)

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — секреты для токенов
- `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` — сроки жизни токенов
- `REDIS_HOST` / `REDIS_PORT` — Redis для блэклиста сессий
- `FRONTEND_URL` — публичный URL фронта для ссылки в письме восстановления
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASSWORD` (или `SMTP_PASS`) — SMTP для писем
- `MAIL_FROM_ADDRESS` / `MAIL_FROM_NAME` — отправитель писем
- `PASSWORD_RESET_EXPIRES_MINUTES` — TTL ссылки восстановления (по умолчанию 60)

## Особенности
- Refresh-токены хранятся хешированными (bcrypt)
- При логине на один email с несколькими аккаунтами возвращается список аккаунтов для выбора
- IP-адрес нормализуется: IPv4-mapped IPv6 (`::ffff:x.x.x.x`) → `x.x.x.x`
- Роли 1 (super_admin), 2 (admin), 3 (hr_manager) могут одобрять заявки

## Восстановление доступа через почту (Account Recovery)
- **Запрос** (`POST /auth/password-reset/request`): всегда возвращает один и тот же
  ответ (no email enumeration). Если есть активные пользователи с этим email —
  старые токены инвалидируются, создаётся новый (32-байтовый hex, в БД только
  sha256-хеш), и `MailService` (nodemailer) шлёт письмо со ссылкой
  `${FRONTEND_URL}/auth/reset-password?token=...`. Если `SMTP_HOST` пуст — ссылка
  пишется в лог сервиса (graceful fallback), запрос не падает.
- **Мульти-аккаунт**: один токен покрывает все аккаунты под email (сотрудник в разных
  компаниях + клиентский портал, roleId=15). `GET /auth/password-reset/accounts`
  отдаёт список `{ userId, accountId, companyName, roleName, isClientPortal }` —
  пользователь на странице сброса выбирает, какие восстановить.
- **Подтверждение** (`POST /auth/password-reset/confirm`, `{ token, userIds[], password }`):
  для каждого выбранного аккаунта обновляет `password_digest`, сбрасывает
  `must_change_password`, удаляет все сессии (`deleteAllByUserId`) и пишет запись в
  `account_recovery_log`. Токен помечается использованным.
- **Аудит** (`GET /auth/account-recovery-log`, Admin/Super Admin): журнал восстановлений
  по текущей компании (`accountId` из JWT), с полем `method` (всегда `email`; колонка
  оставлена для исторических записей). Фронт — таб «Восстановления» в `/dashboard/company`.

> Восстановление по SMS убрано (заказчик отказался — дорого). Осталось только восстановление
> по email; страница `/auth/forgot-password` принимает только email.
