import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * A semantic domain event, written to the transactional outbox (event_outbox)
 * and later published to Kafka `audit.events` by audit-service's relay. Shape
 * matches what both consumers (audit-persist + automation) already expect.
 */
export interface OutboxEvent {
  accountId?: number;
  entityType: string; // task | deal | ...
  entityId?: number;
  action: string; // status_changed | assigned | won | ...
  userId?: number;
  description?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  projectId?: number;
}

/**
 * Transactional-outbox producer. The point of variant B (over the DB-trigger
 * relay) is ATOMICITY + business intent: call `emitWith(tx, event)` inside the
 * same Prisma transaction as the business write, so the event is committed iff
 * the change is — it can never be lost or emitted for a rolled-back write.
 *
 * Raw SQL INSERT (no Prisma model needed) so any service can adopt this by
 * copying this file — no schema/generate changes. Reusable across services.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Insert the event using a caller-provided transaction client (atomic path). */
  async emitWith(tx: any, e: OutboxEvent): Promise<void> {
    const changes = e.changes ? JSON.stringify(e.changes) : null;
    const metadata = JSON.stringify({ source: 'outbox', ...(e.metadata ?? {}) });
    await tx.$executeRaw`
      INSERT INTO event_outbox
        (account_id, entity_type, entity_id, action, user_id, description, changes, metadata, project_id)
      VALUES
        (${e.accountId ?? null}, ${e.entityType}, ${e.entityId ?? null}, ${e.action},
         ${e.userId ?? null}, ${e.description ?? null}, ${changes}::jsonb, ${metadata}::jsonb,
         ${e.projectId ?? null})`;
  }

  /**
   * Best-effort emit in its own transaction, for callers not already in one.
   * Never throws — a failed standalone emit is logged, not propagated (the
   * atomic path is `emitWith`; use it when correctness matters).
   */
  async emit(e: OutboxEvent): Promise<void> {
    try {
      await this.prisma.$transaction((tx) => this.emitWith(tx, e));
    } catch (err) {
      this.logger.warn(`Outbox emit failed (${e.entityType}.${e.action}): ${(err as Error).message}`);
    }
  }
}
