import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer } from 'kafkajs';
import { RuleEngineService, AutomationEvent } from '../engine/rule-engine.service';

/** Same topic the audit-service consumes — automation is a second, independent consumer. */
const AUDIT_TOPIC = 'audit.events';
const GROUP_ID = 'automation-service';

/**
 * Consumes domain events from Kafka and feeds them to the rule engine. This is
 * the second consumer group on `audit.events` — demonstrating real one-to-many
 * fan-out (audit-service persists; automation-service reacts). Boot is never
 * blocked: if the broker is down we retry connecting in the background.
 */
@Injectable()
export class AutomationConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationConsumerService.name);
  private readonly brokers: string[];
  private consumer: Consumer | null = null;
  private stopped = false;

  constructor(
    private readonly config: ConfigService,
    private readonly engine: RuleEngineService,
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
      this.logger.log('Kafka disabled (KAFKA_BROKERS empty) — automation engine inactive');
      return;
    }
    const kafka = new Kafka({
      clientId: 'automation-service',
      brokers: this.brokers,
      retry: { retries: 5 },
      logLevel: 0,
    });
    this.consumer = kafka.consumer({ groupId: GROUP_ID });
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
              const event = JSON.parse(message.value.toString()) as AutomationEvent;
              await this.engine.handleEvent(event);
            } catch (err) {
              this.logger.warn(`Failed to process event: ${(err as Error).message}`);
            }
          },
        });
        this.logger.log(`Automation engine running: ${AUDIT_TOPIC} @ ${this.brokers.join(',')}`);
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
