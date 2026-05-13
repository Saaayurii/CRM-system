# Reports Service (`port 3015`)

## Назначение
Управляет аналитическими отчётами: шаблоны отчётов и сгенерированные экземпляры. Позволяет создавать шаблоны (структура, фильтры, визуализация), запускать генерацию отчётов по проекту или аккаунту, хранить результаты. Поддерживает фильтрацию по проекту и шаблону.

## Ключевые эндпоинты
- `GET    /report-templates` — список шаблонов отчётов
- `GET    /report-templates/:id` — шаблон по ID
- `POST   /report-templates` — создать шаблон
- `PUT    /report-templates/:id` — обновить шаблон
- `DELETE /report-templates/:id` — удалить шаблон
- `GET    /generated-reports` — сгенерированные отчёты (фильтры: projectId, reportTemplateId)
- `GET    /generated-reports/:id` — отчёт по ID
- `POST   /generated-reports` — запустить генерацию отчёта
- `PUT    /generated-reports/:id` — обновить отчёт
- `DELETE /generated-reports/:id` — удалить отчёт

## Модели данных (Prisma)
- `ReportTemplate` — шаблон (name, type, config: JSONB, accountId)
- `GeneratedReport` — сгенерированный отчёт (templateId, projectId, data: JSONB, fileUrl, accountId)

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT

## Особенности
- Результаты отчётов хранятся как JSONB; также может быть ссылка на файл (`fileUrl`) для экспорта в CSV/PDF
- Загрузка CSV-файлов для отчётов обрабатывается через отдельный контроллер в api-gateway (`reports-upload`)
