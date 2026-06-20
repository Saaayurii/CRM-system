import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer } from 'kafkajs';
import { EventLogsService } from '../event-logs.service';
import { CreateEventLogDto } from '../dto/create-event-log.dto';

/** Topic carrying audit/domain events from api-gateway. */
const AUDIT_TOPIC = 'audit.events';
const GROUP_ID = 'audit-service';

/**
 * Consumes audit events from Kafka and persists them via EventLogsService — the
 * same write path used by the HTTP endpoint (which stays as a fallback). Boot is
 * never blocked: if the broker is down we retry connecting in the background.
 */
@Injectable()
export class AuditConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditConsumerService.name);
  private readonly brokers: string[];
  private consumer: Consumer | null = null;
  private stopped = false;

  constructor(
    private readonly config: ConfigService,
    private readonly eventLogsService: EventLogsService,
  ) {
    this.brokers = (this.config.get<string>('kafka.brokers') || '')
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);
  }

  get enabled(): boolean {
    return this.brokers.length > 0;
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log(
        'Kafka disabled (KAFKA_BROKERS empty) — audit accepted via HTTP only',
      );
      return;
    }
    const kafka = new Kafka({
      clientId: 'audit-service',
      brokers: this.brokers,
      retry: { retries: 5 },
      logLevel: 0,
    });
    this.consumer = kafka.consumer({ groupId: GROUP_ID });
    // Don't block boot — keep trying until the broker is reachable.
    void this.start();
  }

  private async start(): Promise<void> {
    while (!this.stopped && this.consumer) {
      try {
        await this.consumer.connect();
        await this.consumer.subscribe({ topic: AUDIT_TOPIC, fromBeginning: false });
        await this.consumer.run({
          eachMessage: async ({ message }) => {
            if (!message.value) return;
            try {
              const dto = JSON.parse(message.value.toString()) as CreateEventLogDto;
              const accountId = dto.accountId ?? 1;
              await this.eventLogsService.create(accountId, dto);
            } catch (err) {
              this.logger.warn(`Failed to persist audit event: ${(err as Error).message}`);
            }
          },
        });
        this.logger.log(`Kafka consumer running: ${AUDIT_TOPIC} @ ${this.brokers.join(',')}`);
        return;
      } catch (err) {
        this.logger.warn(
          `Kafka consumer connect failed, retrying in 10s: ${(err as Error).message}`,
        );
        await new Promise((r) => setTimeout(r, 10_000));
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    if (this.consumer) {
      try {
        await this.consumer.disconnect();
      } catch {
        /* ignore */
      }
    }
  }
}
