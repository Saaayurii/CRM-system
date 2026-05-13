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

## Модели данных (Prisma)
- `User` — пользователь системы (email, passwordHash, roleId, accountId)
- `Account` — тенант/компания
- `RefreshToken` — хранение refresh-токенов с привязкой к сессии
- `UserSession` — активные сессии (userAgent, ipAddress, lastActivity)
- `RegistrationRequest` — заявки на регистрацию со статусом pending/approved/rejected
- `CompanyInvite` — одноразовые инвайт-токены для регистрации компании

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — секреты для токенов
- `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` — сроки жизни токенов
- `REDIS_HOST` / `REDIS_PORT` — Redis для блэклиста сессий

## Особенности
- Refresh-токены хранятся хешированными (bcrypt)
- При логине на один email с несколькими аккаунтами возвращается список аккаунтов для выбора
- IP-адрес нормализуется: IPv4-mapped IPv6 (`::ffff:x.x.x.x`) → `x.x.x.x`
- Роли 1 (super_admin), 2 (admin), 3 (hr_manager) могут одобрять заявки
