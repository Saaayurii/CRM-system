# Clients Service (`port 3018`)

## Назначение
Управляет клиентской базой компании: заказчики, физические или юридические лица, история взаимодействий, доступ клиентов к клиентскому порталу. Поддерживает фильтрацию по статусу и менеджеру. Все данные изолированы по `accountId`.

## Ключевые эндпоинты
- `GET    /clients` — список клиентов (фильтры: status, managerId)
- `GET    /clients/:id` — карточка клиента
- `POST   /clients` — создание клиента
- `PUT    /clients/:id` — обновление данных
- `DELETE /clients/:id` — удаление клиента
- `GET    /client-interactions` — история взаимодействий с клиентом
- `POST   /client-interactions` — добавить взаимодействие
- `PUT    /client-interactions/:id` — обновить взаимодействие
- `DELETE /client-interactions/:id` — удалить взаимодействие
- `GET    /client-portal-access` — записи доступа к порталу
- `POST   /client-portal-access` — выдать доступ к порталу
- `DELETE /client-portal-access/:id` — отозвать доступ

## Модели данных (Prisma)
- `Client` — клиент (name, type, phone, email, status, managerId, accountId)
- `ClientInteraction` — взаимодействие (clientId, userId, type, date, description)
- `ClientPortalAccess` — доступ к порталу (clientId, login, passwordHash)

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT

## Особенности
- Клиентский портал — отдельная функция, позволяющая клиенту просматривать статус проекта
- История взаимодействий фиксирует звонки, встречи, письма
