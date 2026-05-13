# Training Service (`port 3020`)

## Назначение
Управляет обучением персонала: учебные материалы по категориям, тесты для проверки знаний с вопросами, попытки прохождения тестов и прогресс обучения сотрудников. Позволяет отслеживать, кто прошёл обучение и с каким результатом.

## Ключевые эндпоинты
- `GET    /training-materials` — учебные материалы (фильтр по category)
- `GET    /training-materials/:id` — материал по ID
- `POST   /training-materials` — создать материал
- `PUT    /training-materials/:id` — обновить
- `DELETE /training-materials/:id` — удалить
- `GET    /knowledge-tests` — список тестов
- `POST   /knowledge-tests` — создать тест
- `PUT    /knowledge-tests/:id` — обновить тест
- `DELETE /knowledge-tests/:id` — удалить тест
- `GET    /test-attempts` — попытки прохождения тестов
- `POST   /test-attempts` — зафиксировать попытку
- `GET    /training-progress` — прогресс обучения пользователей
- `POST   /training-progress` — обновить прогресс

## Модели данных (Prisma)
- `TrainingMaterial` — учебный материал (title, content, category, fileUrl, accountId)
- `KnowledgeTest` — тест (title, questions: JSONB, passingScore, accountId)
- `TestAttempt` — попытка (testId, userId, score, isPassed, completedAt)
- `TrainingProgress` — прогресс (userId, materialId, completedAt, accountId)

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT

## Особенности
- Вопросы теста хранятся как JSONB-массив в поле `questions`
- Прогресс обучения позволяет HR отслеживать прохождение курсов сотрудниками
