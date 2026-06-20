import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';

/**
 * Thin Kafka producer for domain events (currently audit). Designed to degrade
 * gracefully: if KAFKA_BROKERS is empty or the broker is unreachable, `emit`
 * returns false so callers can fall back (e.g. the audit interceptor posts over
 * HTTP instead). Never throws to the caller.
 */
@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly brokers: string[];
  private producer: Producer | null = null;
  private connected = false;

  constructor(private readonly config: ConfigService) {
    this.brokers = (this.config.get<string>('kafka.brokers') || '')
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);
  }

  get enabled(): boolean {
    return this.brokers.length > 0;
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.log(
        'Kafka disabled (KAFKA_BROKERS empty) — audit will use HTTP fallback',
      );
      return;
    }
    const kafka = new Kafka({
      clientId: 'api-gateway',
      brokers: this.brokers,
      retry: { retries: 3 },
      logLevel: 0, // NOTHING — kafkajs is noisy; we log connection state ourselves
    });
    this.producer = kafka.producer({ allowAutoTopicCreation: true });
    // Connect in the background so a slow/absent broker never blocks boot.
    void this.connect();
  }

  private async connect(): Promise<boolean> {
    if (!this.producer) return false;
    if (this.connected) return true;
    try {
      await this.producer.connect();
      this.connected = true;
      this.logger.log(`Kafka producer connected: ${this.brokers.join(',')}`);
      return true;
    } catch (err) {
      this.logger.warn(
        `Kafka producer connect failed (HTTP fallback active): ${(err as Error).message}`,
      );
      return false;
    }
  }

  /** Publish a JSON event. Returns true if sent, false if it should fall back. */
  async emit(topic: string, message: unknown): Promise<boolean> {
    if (!this.enabled || !this.producer) return false;
    if (!this.connected && !(await this.connect())) return false;
    try {
      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify(message) }],
      });
      return true;
    } catch (err) {
      this.connected = false; // force a reconnect attempt next time
      this.logger.warn(`Kafka emit failed (${topic}): ${(err as Error).message}`);
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.producer && this.connected) {
      try {
        await this.producer.disconnect();
      } catch {
        /* ignore */
      }
    }
  }
}
