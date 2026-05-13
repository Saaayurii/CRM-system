# Documents Service (`port 3014`)

## Назначение
Управляет проектной документацией: хранение ссылок на файлы, привязка к проектам, типизация документов, шаблоны для генерации. Отдельный модуль PDF позволяет генерировать документы из шаблонов. Поддерживает фильтрацию по проекту, типу и статусу документа.

## Ключевые эндпоинты
- `GET    /documents` — список документов (фильтры: projectId, documentType, status)
- `GET    /documents/:id` — данные документа
- `POST   /documents` — создание записи документа
- `PUT    /documents/:id` — обновление
- `DELETE /documents/:id` — удаление
- `GET    /document-templates` — список шаблонов документов
- `POST   /document-templates` — создание шаблона
- `PUT    /document-templates/:id` — обновление шаблона
- `DELETE /document-templates/:id` — удаление шаблона
- `POST   /pdf/generate` — генерация PDF из шаблона

## Модели данных (Prisma)
- `Document` — документ (title, documentType, status, fileUrl, projectId, accountId)
- `DocumentTemplate` — шаблон документа (name, content: JSONB, accountId)

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT

## Особенности
- Сервис хранит метаданные документов; сами файлы загружаются через api-gateway (`documents-upload`)
- Шаблоны содержат JSONB-поле с разметкой для PDF-генерации
