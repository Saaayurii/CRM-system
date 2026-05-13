# Finance Service (`port 3007`)

## Назначение
Управляет финансами компании: платёжные счета, платежи, бюджеты проектов со статьями расходов, акты выполненных работ, расчёт зарплаты и бонусов. Все операции привязаны к `accountId` и поддерживают фильтрацию по проекту.

## Ключевые эндпоинты
- `GET    /payment-accounts` — список платёжных счетов
- `POST   /payment-accounts` — создание счёта
- `PUT    /payment-accounts/:id` — обновление счёта
- `DELETE /payment-accounts/:id` — удаление счёта
- `GET    /payments` — список платежей (фильтр по projectId)
- `POST   /payments` — создание платежа
- `PUT    /payments/:id` — обновление платежа
- `DELETE /payments/:id` — удаление платежа
- `GET    /budgets` — список бюджетов (фильтр по projectId)
- `POST   /budgets` — создание бюджета
- `PUT    /budgets/:id` — обновление бюджета
- `POST   /budgets/:id/items` — добавление статьи бюджета
- `GET    /acts` — акты выполненных работ
- `POST   /acts` — создание акта
- `GET    /payroll` — расчётные ведомости
- `GET    /bonuses` — список бонусов

## Модели данных (Prisma)
- `PaymentAccount` — платёжный счёт (name, bankName, accountNumber, accountId)
- `Payment` — платёж (amount, direction, projectId, paymentAccountId, accountId)
- `Budget` — бюджет проекта (projectId, totalAmount, accountId)
- `BudgetItem` — статья бюджета (budgetId, category, plannedAmount, actualAmount)
- `Act` — акт выполненных работ (projectId, amount, status, accountId)
- `Payroll` — расчётная ведомость (userId, periodStart, periodEnd, amount)
- `Bonus` — бонус сотруднику (userId, amount, reason)

## Переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_ACCESS_SECRET` — секрет для верификации JWT

## Особенности
- Бюджет может содержать несколько статей расходов (BudgetItem)
- При создании платежа фиксируется `userId` создателя
