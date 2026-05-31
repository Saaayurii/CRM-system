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

## Строительная ВИКИ (Construction Wiki) — нормативная база

Отдельный модуль `construction-norms` внутри wiki-service: централизованная база
строительных норм (СНиПы, ГОСТы, СП, региональные нормы). В отличие от `WikiPage`,
контент **глобальный** (не изолируется по `accountId`, как dictionary-service) и виден
всем компаниям. Запись разрешена только `super_admin` (roleId=1) через `SuperAdminGuard`.

### Эндпоинты (фронт ходит через api-gateway `/api/v1/*`)
- `GET/POST/PUT/DELETE /norm-categories` — иерархические категории (parentId, documentCount)
- `GET /norm-documents` — список/поиск (фильтры `categoryId`, `docType`, `status`, `tag`, `q`)
- `GET /norm-documents/stats` — агрегаты (всего/действующих/устаревших/по типам)
- `GET /norm-documents/:id` — карточка (инкрементит `viewCount`, отдаёт related/supersededBy)
- `POST/PUT/DELETE /norm-documents` — CRUD (super_admin)
- `GET /norm-bookmarks`, `POST/DELETE /norm-bookmarks/:documentId` — избранное по userId

### Модели (Prisma)
- `NormCategory` — категория (name, slug, icon, parentId — самоссылка, sortOrder)
- `NormDocument` — документ (docType: snip|gost|sp|regional|other, code, title, content
  (Markdown), summary, status: active|superseded|draft, effectiveDate, supersededDate,
  supersededById, tags/attachments/relatedIds JSON, keywords, viewCount)
- `NormBookmark` — избранное (userId, documentId, unique)

### Особенности
- Полнотекстовый поиск через ILIKE по title/code/summary/content/keywords
- Версионность актуальности: `status=superseded` + `supersededById` → ссылка на новую редакцию
- Стартовые категории создаются миграцией `database/migrations/construction_wiki_norms.sql`
