import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/** Canonical event_outbox DDL — kept identical to database/migrations/event_outbox.sql. */
const EVENT_OUTBOX_DDL = `
  CREATE TABLE IF NOT EXISTS event_outbox (
    id          BIGSERIAL    PRIMARY KEY,
    account_id  INTEGER,
    entity_type TEXT         NOT NULL,
    entity_id   BIGINT,
    action      TEXT         NOT NULL,
    user_id     BIGINT,
    description TEXT,
    changes     JSONB,
    metadata    JSONB,
    project_id  INTEGER,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
  )`;

/**
 * A semantic domain event, written to the transactional outbox (event_outbox)
 * and later published to Kafka `audit.events` by audit-service's relay. Shape
 * matches what both consumers (audit-persist + automation) already expect.
 */
export interface OutboxEvent {
  accountId?: number;
  entityType: string; // task | deal | ...
  entityId?: number;
  action: string; // status_changed | won | lost | failed | ...
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
export class OutboxService implements OnModuleInit {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Self-create the outbox table on boot so the writer never fails on a missing
   * table — critically, the outbox INSERT runs inside the business transaction,
   * so a missing table would otherwise roll back the actual write. Idempotent;
   * removes any dependency on migration ordering.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(EVENT_OUTBOX_DDL);
    } catch (err) {
      this.logger.warn(`Ensuring event_outbox table failed: ${(err as Error).message}`);
    }
  }

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
