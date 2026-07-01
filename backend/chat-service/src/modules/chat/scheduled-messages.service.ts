import { Injectable, Logger, BadRequestException, NotFoundException, forwardRef, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { ChatGateway } from './chat.gateway';
import {
  SCHEDULED_MESSAGES_QUEUE,
  SCHEDULED_MESSAGE_JOB_DELIVER,
} from './queues/scheduled-messages.constants';

interface ScheduleDto {
  messageText?: string;
  messageType?: string;
  attachments?: any[];
  replyToMessageId?: number;
  topicId?: number;
  silent?: boolean;
  scheduledAt: string; // ISO
}

@Injectable()
export class ScheduledMessagesService {
  private readonly logger = new Logger(ScheduledMessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly gateway: ChatGateway,
    @InjectQueue(SCHEDULED_MESSAGES_QUEUE)
    private readonly queue: Queue,
  ) {}

  private get repo() {
    return (this.prisma as any).chatScheduledMessage;
  }

  /** Список отложенных сообщений текущего пользователя в канале. */
  async list(channelId: number, userId: number) {
    return this.repo.findMany({
      where: { channelId, userId },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async schedule(channelId: number, userId: number, dto: ScheduleDto) {
    const when = new Date(dto.scheduledAt);
    if (isNaN(when.getTime())) {
      throw new BadRequestException('Некорректная дата отправки');
    }
    const delay = when.getTime() - Date.now();
    if (delay < 5_000) {
      throw new BadRequestException('Время отправки должно быть в будущем');
    }
    if (!dto.messageText?.trim() && (!dto.attachments || dto.attachments.length === 0)) {
      throw new BadRequestException('Пустое сообщение');
    }

    const row = await this.repo.create({
      data: {
        channelId,
        userId,
        topicId: dto.topicId ?? null,
        messageText: dto.messageText ?? '',
        messageType: dto.messageType ?? 'text',
        attachments: dto.attachments ?? [],
        replyToMessageId: dto.replyToMessageId ?? null,
        silent: !!dto.silent,
        scheduledAt: when,
      },
    });

    // Ставим отложенную задачу; jobId привязываем к строке для отмены.
    const jobId = `sched:${row.id}`;
    try {
      await this.queue.add(
        SCHEDULED_MESSAGE_JOB_DELIVER,
        { scheduledId: row.id },
        { delay, jobId, removeOnComplete: true, removeOnFail: false },
      );
      await this.repo.update({ where: { id: row.id }, data: { jobId } });
    } catch (err) {
      this.logger.error(`Не удалось поставить отложенную задачу: ${(err as Error).message}`);
    }

    const saved = await this.repo.findUnique({ where: { id: row.id } });
    this.notifyOwner(userId, 'scheduled:created', { channelId, message: saved });
    return saved;
  }

  async cancel(channelId: number, id: number, userId: number) {
    const row = await this.repo.findUnique({ where: { id } });
    if (!row || row.userId !== userId || row.channelId !== channelId) {
      throw new NotFoundException('Отложенное сообщение не найдено');
    }
    await this.removeJob(row.jobId);
    await this.repo.delete({ where: { id } });
    this.notifyOwner(userId, 'scheduled:removed', { channelId, id });
    return { success: true };
  }

  /** Отправить отложенное сообщение немедленно. */
  async sendNow(channelId: number, id: number, userId: number) {
    const row = await this.repo.findUnique({ where: { id } });
    if (!row || row.userId !== userId || row.channelId !== channelId) {
      throw new NotFoundException('Отложенное сообщение не найдено');
    }
    await this.removeJob(row.jobId);
    await this.deliver(row.id);
    return { success: true };
  }

  /** Вызывается воркером в назначенное время и методом sendNow. */
  async deliver(scheduledId: number) {
    const row = await this.repo.findUnique({ where: { id: scheduledId } });
    if (!row) return; // уже отменено/доставлено

    const channel = await (this.prisma as any).chatChannel.findUnique({ where: { id: row.channelId } });
    if (!channel) {
      await this.repo.delete({ where: { id: scheduledId } }).catch(() => undefined);
      return;
    }
    const user = await (this.prisma as any).user.findUnique({ where: { id: row.userId } });

    await this.gateway.deliverMessage({
      channelId: row.channelId,
      accountId: channel.accountId,
      userId: row.userId,
      senderName: user?.name || 'Пользователь',
      messageText: row.messageText,
      messageType: row.messageType,
      attachments: Array.isArray(row.attachments) ? row.attachments : [],
      replyToMessageId: row.replyToMessageId ?? undefined,
      topicId: row.topicId ?? undefined,
      silent: row.silent,
    });

    await this.repo.delete({ where: { id: scheduledId } }).catch(() => undefined);
    this.notifyOwner(row.userId, 'scheduled:removed', { channelId: row.channelId, id: scheduledId });
  }

  private async removeJob(jobId?: string | null) {
    if (!jobId) return;
    try {
      const job = await this.queue.getJob(jobId);
      if (job) await job.remove();
    } catch (err) {
      this.logger.warn(`Не удалось снять задачу ${jobId}: ${(err as Error).message}`);
    }
  }

  /** Уведомляем все устройства владельца об изменении списка отложенных. */
  private notifyOwner(userId: number, event: string, payload: any) {
    try {
      this.gateway.server.to(`user:${userId}`).emit(event, payload);
    } catch {
      // gateway may not be ready — не критично
    }
  }
}
