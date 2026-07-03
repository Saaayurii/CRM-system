import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';

/**
 * Тонкий Kafka-продьюсер для публикации доменных событий чата в шину `audit.events`
 * (чтобы automation-service мог реагировать на действия админов канала).
 * Деградирует мягко: при пустом/недоступном брокере возвращает false вместо
 * исключения, поэтому медленный/отсутствующий Kafka никогда не блокирует работу.
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
      this.logger.log('Kafka disabled (KAFKA_BROKERS empty) — chat producer inactive');
      return;
    }
    const kafka = new Kafka({
      clientId: 'chat-service',
      brokers: this.brokers,
      retry: { retries: 3 },
      logLevel: 0,
    });
    this.producer = kafka.producer({ allowAutoTopicCreation: true });
    // Подключаемся в фоне, чтобы медленный/отсутствующий брокер не блокировал boot.
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
      this.logger.warn(`Kafka producer connect failed: ${(err as Error).message}`);
      return false;
    }
  }

  /** Публикует JSON-событие. true — отправлено, false — стоит повторить. */
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
      this.connected = false; // форсируем реконнект в следующий раз
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
