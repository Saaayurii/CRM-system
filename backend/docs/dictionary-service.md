# Dictionary Service (`port 3016`)

## Назначение
Хранит справочные (lookup) данные системы: типы словарей и их значения. Используется другими сервисами для получения стандартизированных перечней (категории, статусы, типы). Словари не привязаны к конкретному аккаунту — они глобальны для всей системы.

## Ключевые эндпоинты
- `GET    /dictionary-types` — список всех типов словарей
- `GET    /dictionary-types/:id` — тип словаря по ID
- `POST   /dictionary-types` — создание типа
- `PUT    /dictionary-types/:id` — обновление типа
- `DELETE /dictionary-types/:id` — удаление типа
- `GET    /dictionary-values` — список значений словаря
- `GET    /dictionary-values/:id` — значение по ID
- `POST   /dictionary-values` — добавление значения
- `PUT    /dictionary-values/:id` — обновление значения
- `DELETE /dictionary-values/:id` — удаление значения

## Модели данных (Prisma)
- `DictionaryType` — тип словаря (code, name, description)
- `DictionaryValue` — значение (typeId, code, name, sortOrder)

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT

## Особенности
- Данные глобальны: нет изоляции по `accountId`
- Используется как справочник для dropdown-списков во всех модулях фронтенда
