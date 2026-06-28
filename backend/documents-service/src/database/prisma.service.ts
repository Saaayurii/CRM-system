import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';
import { getCurrentUserId } from '../common/context/user-context';

/** Операции Prisma, которые пишут в БД (их оборачиваем для атрибуции аудита). */
const WRITE_OPS = new Set<string>([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
]);

@Injectable()
export class PrismaService extends PrismaClient {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();

    // База-клиент без расширения — через него открываем транзакцию (его tx
    // НЕ проходит через расширение ниже, поэтому рекурсии нет).
    const base = this;

    // Расширение: каждую write-операцию выполняем внутри транзакции, где первым
    // делом ставим app.current_user_id. DB-триггеры аудита (audit.row_history)
    // читают этот параметр через current_setting(...) и пишут changed_by.
    // Fail-open: нет userId (boot/фоновые джобы) или операция на чтение —
    // обычный путь без накладных расходов.
    const extended = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const userId = getCurrentUserId();
            if (userId == null || !WRITE_OPS.has(operation)) {
              return query(args);
            }
            return base.$transaction(async (tx) => {
              await tx.$executeRawUnsafe(
                `SET LOCAL app.current_user_id = '${Number(userId)}'`,
              );
              // имя делегата у tx — camelCase (tx.payment), а model может
              // прийти в PascalCase (Payment) — резолвим оба варианта.
              const anyTx = tx as Record<string, any>;
              const delegate =
                model in anyTx
                  ? model
                  : model.charAt(0).toLowerCase() + model.slice(1);
              return anyTx[delegate][operation](args);
            });
          },
        },
      },
    });

    // $extends возвращает НОВЫЙ объект; подменяем им инстанс провайдера, сохраняя
    // тип PrismaService для DI. Все модель-делегаты у extended на месте.
    return extended as unknown as PrismaService;
  }
}
