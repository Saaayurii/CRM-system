# HR Service (`port 3009`)

## Назначение
Управляет кадровыми данными компании: команды сотрудников с участниками, табели посещаемости, кадровые документы, обучение по охране труда (safety), управление отпусками и больничными. Большинство операций с посещаемостью доступны обычным сотрудникам только для своих записей; администраторы видят все данные.

## Ключевые эндпоинты
- `GET    /teams` — список команд аккаунта (фильтр по status)
- `GET    /teams/:id` — команда по ID
- `POST   /teams` — создание команды
- `PUT    /teams/:id` — обновление команды
- `DELETE /teams/:id` — удаление команды
- `GET    /teams/:id/members` — участники команды
- `POST   /teams/:id/members` — добавление участника
- `DELETE /teams/:id/members/:userId` — удаление участника
- `GET    /attendance` — записи посещаемости
- `POST   /attendance` — создание записи
- `PUT    /attendance/:id` — обновление записи
- `DELETE /attendance/:id` — удаление записи
- `GET    /employee-documents` — кадровые документы
- `POST   /employee-documents` — загрузка документа
- `GET    /time-off` — заявления на отпуск/больничный
- `POST   /time-off` — создание заявления
- `GET    /safety` — записи по охране труда

## Модели данных (Prisma)
- `Team` — команда (name, status, accountId)
- `TeamMember` — участник команды (teamId, userId, roleInTeam)
- `Attendance` — запись посещаемости (userId, date, checkIn, checkOut)
- `EmployeeDocument` — кадровый документ (userId, documentType, fileUrl)
- `TimeOff` — заявление на отсутствие (userId, type, startDate, endDate, status)
- `Safety` — запись по охране труда (userId, trainingDate, nextTrainingDate)

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT

## Особенности
- Роль пользователя из JWT определяет уровень доступа к записям посещаемости (свои vs все)
- Команды HR (`teams`) отличаются от команд проектов (`project team members`)
