# Wiki Service (`port 3019`)

## Назначение
Корпоративная база знаний: создание и редактирование wiki-страниц с поддержкой категоризации. Каждая страница привязана к автору и аккаунту. Поддерживает версионность через запись `createdByUserId` и `updatedByUserId`. Фильтрация по категории.

## Ключевые эндпоинты
- `GET    /wiki-pages` — список страниц (фильтр по category)
- `GET    /wiki-pages/:id` — страница по ID
- `POST   /wiki-pages` — создание страницы
- `PUT    /wiki-pages/:id` — обновление страницы
- `DELETE /wiki-pages/:id` — удаление страницы

## Модели данных (Prisma)
- `WikiPage` — страница (title, content, category, accountId, createdByUserId, updatedByUserId)

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT

## Особенности
- Контент страниц хранится как текст (поддерживается Markdown или HTML в зависимости от конфигурации фронтенда)
- При обновлении фиксируется `updatedByUserId` из JWT
