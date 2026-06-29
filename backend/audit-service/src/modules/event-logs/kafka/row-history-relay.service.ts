import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { KafkaProducerService } from './kafka-producer.service';

/** Topic both audit-service and automation-service already consume. */
const AUDIT_TOPIC = 'audit.events';
const BATCH = 500; // rows per poll
const POLL_INTERVAL_MS = 2000; // idle wait when caught up
const RETRY_INTERVAL_MS = 10_000; // wait after an error (e.g. Kafka/DB down)

/**
 * DB column (table) name → domain entity label. Mirrors the gateway's
 * PATH_TO_ENTITY so events look the same regardless of producer. Tables not
 * listed fall back to their raw name. Keep in sync with the audited_tables
 * array in database/migrations/audit_row_history.sql.
 */
const TABLE_TO_ENTITY: Record<string, string> = {
  payments: 'payment',
  payment_accounts: 'payment_account',
  company_bank_accounts: 'company_bank_account',
  budgets: 'budget',
  budget_items: 'budget_item',
  acts: 'act',
  act_items: 'act_item',
  payroll: 'payroll',
  bonuses: 'bonus',
  supplier_orders: 'supplier_order',
  supplier_order_items: 'supplier_order_item',
  commercial_proposals: 'commercial_proposal',
  proposal_lines: 'proposal_line',
  clients: 'client',
  client_portal_access: 'client_portal_access',
  contractors: 'contractor',
  suppliers: 'supplier',
  accounts: 'account',
  users: 'user',
  roles: 'role',
  registration_requests: 'registration',
  employee_documents: 'employee_document',
  attendance: 'attendance',
  time_off_requests: 'time_off',
  safety_incidents: 'safety_incident',
  safety_training_records: 'safety_training_record',
  safety_trainings: 'safety_training',
  inspections: 'inspection',
  defects: 'defect',
  control_points: 'control_point',
  quality_standards: 'quality_standard',
  projects: 'project',
  construction_sites: 'construction_site',
  building_objects: 'building_object',
  unique_facilities: 'unique_facility',
  documents: 'document',
  equipment: 'equipment',
  equipment_maintenance: 'equipment_maintenance',
};

/**
 * Audited tables the relay must NOT turn into Kafka events because the gateway
 * already emits them with richer semantics (e.g. registration approve/reject vs
 * a plain row update). The row still lands in audit.row_history for compliance —
 * we just don't double-publish it. Keep aligned with RELAY_OWNED_SEGMENTS in the
 * gateway's audit.interceptor.ts (a table is owned by exactly one producer).
 */
const RELAY_EXCLUDED_TABLES = new Set(['registration_requests']);

const ACTION_NAMES: Record<string, string> = {
  create: 'Создание',
  update: 'Изменение',
  delete: 'Удаление',
};

// Never put secrets on the event bus / into the audit log.
const SENSITIVE_COLUMNS = new Set([
  'password',
  'password_hash',
  'password_digest',
  'refresh_token',
  'token',
  'access_token',
  'secret',
  'pin',
  'passport_data',
]);

interface RowHistoryRow {
  id: bigint;
  table_name: string;
  row_id: bigint | null;
  op: string;
  old_row: Record<string, unknown> | null;
  new_row: Record<string, unknown> | null;
  changed_by: bigint | null;
}

/**
 * Transactional-outbox relay: tails audit.row_history (populated by DB triggers
 * that catch EVERY write — app, BullMQ jobs, raw SQL — even in-bypass of the
 * gateway) and publishes each change as a domain event to Kafka. This makes the
 * database the single source of truth for "what changed": the gateway's HTTP
 * interceptor no longer needs to guess events from verbs, and writes that never
 * touch the gateway now reach automation/audit. See audit_row_history_relay.sql.
 *
 * At-least-once: the cursor advances only past rows we successfully published,
 * so a Kafka/DB hiccup pauses (never drops) the stream and resumes from the same
 * point. Consumers must tolerate the occasional duplicate.
 */
@Injectable()
export class RowHistoryRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RowHistoryRelayService.name);
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
      this.logger.log('Kafka disabled (KAFKA_BROKERS empty) — row-history relay inactive');
      return;
    }
    void this.loop();
  }

  onModuleDestroy(): void {
    this.stopped = true;
  }

  private async loop(): Promise<void> {
    this.logger.log(`Row-history relay started → topic ${AUDIT_TOPIC}`);
    while (!this.stopped) {
      try {
        await this.ensureCursor();
        const published = await this.pumpBatch();
        // Caught up → idle wait; full batch → keep draining immediately.
        await this.sleep(published >= BATCH ? 0 : POLL_INTERVAL_MS);
      } catch (err) {
        this.logger.warn(
          `Relay batch failed, retrying in ${RETRY_INTERVAL_MS / 1000}s: ${(err as Error).message}`,
        );
        await this.sleep(RETRY_INTERVAL_MS);
      }
    }
  }

  /**
   * Idempotently create the cursor row (and table) so deploying the code can't
   * race the SQL migration — first run starts from the current MAX(id) instead
   * of replaying the whole backlog. Requires the `audit` schema (already created
   * by audit_row_history.sql); if absent, this throws and the loop retries.
   */
  private async ensureCursor(): Promise<void> {
    if (this.cursorReady) return;
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS audit.row_history_relay_cursor (
        id          SMALLINT     PRIMARY KEY DEFAULT 1,
        last_id     BIGINT       NOT NULL DEFAULT 0,
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT row_history_relay_cursor_singleton CHECK (id = 1)
      )`);
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO audit.row_history_relay_cursor (id, last_id)
      VALUES (1, COALESCE((SELECT MAX(id) FROM audit.row_history), 0))
      ON CONFLICT (id) DO NOTHING`);
    this.cursorReady = true;
  }

  /** Publishes one batch; returns how many rows were published (cursor advanced). */
  private async pumpBatch(): Promise<number> {
    const cursorRows = await this.prisma.$queryRawUnsafe<{ last_id: bigint }[]>(
      'SELECT last_id FROM audit.row_history_relay_cursor WHERE id = 1',
    );
    const cursor = cursorRows.length ? BigInt(cursorRows[0].last_id) : 0n;

    const rows = await this.prisma.$queryRawUnsafe<RowHistoryRow[]>(
      `SELECT id, table_name, row_id, op, old_row, new_row, changed_by
         FROM audit.row_history
        WHERE id > $1
        ORDER BY id ASC
        LIMIT $2`,
      cursor,
      BATCH,
    );
    if (!rows.length) return 0;

    let lastPublished = cursor;
    for (const row of rows) {
      const event = this.toEvent(row);
      // Skip non-publishable rows (e.g. nothing to say) but still advance cursor.
      if (event) {
        const ok = await this.producer.emit(AUDIT_TOPIC, event);
        if (!ok) {
          // Kafka unavailable — persist progress so far, retry the rest later.
          if (lastPublished > cursor) await this.saveCursor(lastPublished);
          throw new Error('Kafka emit returned false');
        }
      }
      lastPublished = BigInt(row.id);
    }

    await this.saveCursor(lastPublished);
    return rows.length;
  }

  private async saveCursor(lastId: bigint): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      'UPDATE audit.row_history_relay_cursor SET last_id = $1, updated_at = now() WHERE id = 1',
      lastId,
    );
  }

  /** Map a row-history record to the shared audit.events payload shape. */
  private toEvent(row: RowHistoryRow): Record<string, unknown> | null {
    // Owned by the gateway (richer semantics) — skip but advance the cursor.
    if (RELAY_EXCLUDED_TABLES.has(row.table_name)) return null;
    const oldRow = row.old_row ?? undefined;
    const newRow = row.new_row ?? undefined;
    const entityType = TABLE_TO_ENTITY[row.table_name] ?? row.table_name;
    const action = this.toAction(row.op, oldRow, newRow);
    const entityId = row.row_id == null ? undefined : Number(row.row_id);
    const userId = row.changed_by == null ? undefined : Number(row.changed_by);
    const accountId = this.pickNumber(newRow, oldRow, 'account_id');
    const projectId = this.pickNumber(newRow, oldRow, 'project_id');

    const changes: Record<string, unknown> = {};
    if (oldRow) changes.old = this.sanitize(oldRow);
    if (newRow) changes.new = this.sanitize(newRow);

    return {
      accountId,
      eventType: 'data_change',
      eventCategory: 'crud',
      action,
      entityType,
      entityId,
      userId,
      description: this.describe(action, entityType, entityId),
      changes: Object.keys(changes).length ? changes : undefined,
      metadata: { source: 'row_history', table: row.table_name, op: row.op },
      projectId,
    };
  }

  private toAction(
    op: string,
    oldRow?: Record<string, unknown>,
    newRow?: Record<string, unknown>,
  ): string {
    if (op === 'INSERT') return 'create';
    if (op === 'DELETE') return 'delete';
    // Soft delete (deleted_at goes null → set) reads as a delete for automation.
    if (op === 'UPDATE' && !oldRow?.deleted_at && newRow?.deleted_at) return 'delete';
    return 'update';
  }

  private pickNumber(
    a: Record<string, unknown> | undefined,
    b: Record<string, unknown> | undefined,
    key: string,
  ): number | undefined {
    const v = a?.[key] ?? b?.[key];
    return typeof v === 'number' ? v : undefined;
  }

  private describe(action: string, entityType: string, id?: number): string {
    const a = ACTION_NAMES[action] ?? action;
    return id ? `${a}: ${entityType} #${id}` : `${a}: ${entityType}`;
  }

  private sanitize(row: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (!SENSITIVE_COLUMNS.has(k)) out[k] = v;
    }
    return out;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
