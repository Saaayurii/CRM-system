import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { KafkaProducerService } from './kafka-producer.service';

/** Same topic both consumers (audit-persist + automation) already read. */
const AUDIT_TOPIC = 'audit.events';
const BATCH = 500;
const POLL_INTERVAL_MS = 2000;
const RETRY_INTERVAL_MS = 10_000;

interface OutboxRow {
  id: bigint;
  account_id: number | null;
  entity_type: string;
  entity_id: bigint | null;
  action: string;
  user_id: bigint | null;
  description: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  project_id: number | null;
}

/**
 * Drains the transactional outbox (public.event_outbox — written by domain
 * services inside their business transactions) to Kafka. Sibling of the
 * row-history relay: that one carries row-level changes (variant A), this one
 * carries SEMANTIC events like task.status_changed (variant B). Same payload
 * shape, same topic, same consumers. Same at-least-once cursor discipline.
 */
@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private readonly enabled: boolean;
  private stopped = false;
  private cursorReady = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly producer: KafkaProducerService,
  ) {
    this.enabled = !!(this.config.get<string>('kafka.brokers') || '').trim();
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log('Kafka disabled (KAFKA_BROKERS empty) — outbox relay inactive');
      return;
    }
    void this.loop();
  }

  onModuleDestroy(): void {
    this.stopped = true;
  }

  private async loop(): Promise<void> {
    this.logger.log(`Outbox relay started → topic ${AUDIT_TOPIC}`);
    while (!this.stopped) {
      try {
        await this.ensureCursor();
        const published = await this.pumpBatch();
        await this.sleep(published >= BATCH ? 0 : POLL_INTERVAL_MS);
      } catch (err) {
        this.logger.warn(
          `Outbox batch failed, retrying in ${RETRY_INTERVAL_MS / 1000}s: ${(err as Error).message}`,
        );
        await this.sleep(RETRY_INTERVAL_MS);
      }
    }
  }

  /** Self-create cursor (table created by event_outbox.sql; start from MAX id). */
  private async ensureCursor(): Promise<void> {
    if (this.cursorReady) return;
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS event_outbox_relay_cursor (
        id          SMALLINT     PRIMARY KEY DEFAULT 1,
        last_id     BIGINT       NOT NULL DEFAULT 0,
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT event_outbox_relay_cursor_singleton CHECK (id = 1)
      )`);
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO event_outbox_relay_cursor (id, last_id)
      VALUES (1, COALESCE((SELECT MAX(id) FROM event_outbox), 0))
      ON CONFLICT (id) DO NOTHING`);
    this.cursorReady = true;
  }

  private async pumpBatch(): Promise<number> {
    const cursorRows = await this.prisma.$queryRawUnsafe<{ last_id: bigint }[]>(
      'SELECT last_id FROM event_outbox_relay_cursor WHERE id = 1',
    );
    const cursor = cursorRows.length ? BigInt(cursorRows[0].last_id) : 0n;

    const rows = await this.prisma.$queryRawUnsafe<OutboxRow[]>(
      `SELECT id, account_id, entity_type, entity_id, action, user_id,
              description, changes, metadata, project_id
         FROM event_outbox
        WHERE id > $1
        ORDER BY id ASC
        LIMIT $2`,
      cursor,
      BATCH,
    );
    if (!rows.length) return 0;

    let lastPublished = cursor;
    for (const row of rows) {
      const ok = await this.producer.emit(AUDIT_TOPIC, this.toEvent(row));
      if (!ok) {
        if (lastPublished > cursor) await this.saveCursor(lastPublished);
        throw new Error('Kafka emit returned false');
      }
      lastPublished = BigInt(row.id);
    }

    await this.saveCursor(lastPublished);
    return rows.length;
  }

  private async saveCursor(lastId: bigint): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      'UPDATE event_outbox_relay_cursor SET last_id = $1, updated_at = now() WHERE id = 1',
      lastId,
    );
  }

  /** Map an outbox row (snake_case) to the shared audit.events payload (camelCase). */
  private toEvent(row: OutboxRow): Record<string, unknown> {
    return {
      accountId: row.account_id ?? undefined,
      eventType: 'domain_event',
      eventCategory: 'crud',
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id == null ? undefined : Number(row.entity_id),
      userId: row.user_id == null ? undefined : Number(row.user_id),
      description: row.description ?? undefined,
      changes: row.changes ?? undefined,
      metadata: row.metadata ?? undefined,
      projectId: row.project_id ?? undefined,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
