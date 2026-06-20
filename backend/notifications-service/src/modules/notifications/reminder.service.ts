import { Injectable, Logger } from '@nestjs/common';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationsService } from './notifications.service';

/**
 * Scans shared-DB domain tables for items approaching/past their date and creates
 * reminder notifications. Centralised here (the notifications hub) so reminders
 * live in one place instead of a scheduler in every domain service. Dedup is done
 * against the notifications table, so no per-table schema changes are needed.
 */
@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);
  /** Don't recreate the same reminder more than once per ~day. */
  private static readonly DEDUP_MS = 20 * 60 * 60 * 1000;
  /** Lead time for renewable certifications/briefings (need time to re-train). */
  private static readonly RENEWAL_WINDOW_DAYS = 7;

  constructor(
    private readonly repo: NotificationRepository,
    private readonly notifications: NotificationsService,
  ) {}

  async runAll(): Promise<void> {
    const tasks = await this.scanTasks();
    const inspections = await this.scanInspections();
    const equipment = await this.scanEquipment();
    const calendar = await this.scanCalendar();
    const training = await this.scanTraining();
    const briefings = await this.scanBriefings();
    const permits = await this.scanHsePermits();
    const orders = await this.scanSupplierOrders();
    const documents = await this.scanDocuments();
    const followups = await this.scanClientFollowups();
    this.logger.log(
      `Reminders created: ${tasks} task(s), ${inspections} inspection(s), ` +
        `${equipment} equipment, ${calendar} event(s), ${training} training, ${briefings} briefing(s), ` +
        `${permits} permit(s), ${orders} order(s), ${documents} document(s), ${followups} followup(s)`,
    );
  }

  private isOverdue(date: Date): boolean {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime();
  }

  private fmt(date: Date): string {
    return new Date(date).toLocaleDateString('ru-RU');
  }

  private async scanTasks(): Promise<number> {
    const rows = await this.repo.findDueTaskReminders();
    let created = 0;
    for (const r of rows) {
      const type = 'task_due_reminder';
      if (
        await this.repo.hasRecentReminder(
          r.userId,
          'task',
          r.taskId,
          type,
          ReminderService.DEDUP_MS,
        )
      )
        continue;
      const overdue = this.isOverdue(r.dueDate);
      await this.notifications.createNotification(r.accountId, {
        userId: r.userId,
        title: overdue ? 'Задача просрочена' : 'Срок задачи подходит',
        message: `«${r.title}» — срок ${this.fmt(r.dueDate)}`,
        notificationType: type,
        entityType: 'task',
        entityId: r.taskId,
        channels: ['in_app', 'push'],
        priority: overdue ? 3 : 2,
        actionUrl: '/dashboard/tasks',
      });
      created++;
    }
    return created;
  }

  private async scanInspections(): Promise<number> {
    const rows = await this.repo.findDueInspectionReminders();
    let created = 0;
    for (const r of rows) {
      const type = 'inspection_due_reminder';
      if (
        await this.repo.hasRecentReminder(
          r.userId,
          'inspection',
          r.inspectionId,
          type,
          ReminderService.DEDUP_MS,
        )
      )
        continue;
      const overdue = this.isOverdue(r.scheduledDate);
      const where = r.projectName ? ` (${r.projectName})` : '';
      await this.notifications.createNotification(r.accountId, {
        userId: r.userId,
        title: overdue ? 'Инспекция просрочена' : 'Запланирована инспекция',
        message: `Инспекция${where} — ${this.fmt(r.scheduledDate)}`,
        notificationType: type,
        entityType: 'inspection',
        entityId: r.inspectionId,
        channels: ['in_app', 'push'],
        priority: overdue ? 3 : 2,
        actionUrl: '/dashboard/inspections',
      });
      created++;
    }
    return created;
  }

  private async scanEquipment(): Promise<number> {
    const rows = await this.repo.findDueEquipmentReminders();
    let created = 0;
    for (const r of rows) {
      const type = 'equipment_maintenance_reminder';
      if (
        await this.repo.hasRecentReminder(
          r.userId,
          'equipment',
          r.equipmentId,
          type,
          ReminderService.DEDUP_MS,
        )
      )
        continue;
      const overdue = this.isOverdue(r.dueDate);
      await this.notifications.createNotification(r.accountId, {
        userId: r.userId,
        title: overdue ? 'Просрочено ТО техники' : 'Скоро ТО техники',
        message: `«${r.name}» — ТО ${this.fmt(r.dueDate)}`,
        notificationType: type,
        entityType: 'equipment',
        entityId: r.equipmentId,
        channels: ['in_app', 'push'],
        priority: overdue ? 3 : 2,
        actionUrl: '/dashboard/equipment',
      });
      created++;
    }
    return created;
  }

  private async scanCalendar(): Promise<number> {
    const rows = await this.repo.findUpcomingCalendarReminders();
    let created = 0;
    for (const r of rows) {
      const type = 'calendar_event_reminder';
      if (
        await this.repo.hasRecentReminder(
          r.userId,
          'calendar_event',
          r.eventId,
          type,
          ReminderService.DEDUP_MS,
        )
      )
        continue;
      const when = new Date(r.startAt).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      await this.notifications.createNotification(r.accountId, {
        userId: r.userId,
        title: 'Скоро событие',
        message: `«${r.title}» — ${when}`,
        notificationType: type,
        entityType: 'calendar_event',
        entityId: r.eventId,
        channels: ['in_app', 'push'],
        priority: 2,
        actionUrl: '/dashboard/calendar',
      });
      created++;
    }
    return created;
  }

  private async scanTraining(): Promise<number> {
    const rows = await this.repo.findExpiringTrainingReminders(
      ReminderService.RENEWAL_WINDOW_DAYS,
    );
    let created = 0;
    for (const r of rows) {
      const type = 'safety_training_reminder';
      if (
        await this.repo.hasRecentReminder(
          r.userId,
          'safety_training',
          r.trainingId,
          type,
          ReminderService.DEDUP_MS,
        )
      )
        continue;
      const overdue = this.isOverdue(r.expiryDate);
      await this.notifications.createNotification(r.accountId, {
        userId: r.userId,
        title: overdue ? 'Просрочено обучение по ОТ' : 'Истекает обучение по ОТ',
        message: `«${r.name}» — действует до ${this.fmt(r.expiryDate)}`,
        notificationType: type,
        entityType: 'safety_training',
        entityId: r.trainingId,
        channels: ['in_app', 'push'],
        priority: overdue ? 3 : 2,
        actionUrl: '/dashboard/safety',
      });
      created++;
    }
    return created;
  }

  private async scanBriefings(): Promise<number> {
    const rows = await this.repo.findExpiringBriefingReminders(
      ReminderService.RENEWAL_WINDOW_DAYS,
    );
    let created = 0;
    for (const r of rows) {
      const type = 'safety_briefing_reminder';
      if (
        await this.repo.hasRecentReminder(
          r.userId,
          'safety_briefing',
          r.briefingId,
          type,
          ReminderService.DEDUP_MS,
        )
      )
        continue;
      const overdue = this.isOverdue(r.validUntil);
      await this.notifications.createNotification(r.accountId, {
        userId: r.userId,
        title: overdue ? 'Просрочен инструктаж' : 'Истекает инструктаж',
        message: `«${r.title}» — действует до ${this.fmt(r.validUntil)}`,
        notificationType: type,
        entityType: 'safety_briefing',
        entityId: r.briefingId,
        channels: ['in_app', 'push'],
        priority: overdue ? 3 : 2,
        actionUrl: '/dashboard/safety',
      });
      created++;
    }
    return created;
  }

  private async scanHsePermits(): Promise<number> {
    const rows = await this.repo.findExpiringHsePermitReminders(
      ReminderService.RENEWAL_WINDOW_DAYS,
    );
    let created = 0;
    for (const r of rows) {
      const type = 'hse_permit_reminder';
      if (
        await this.repo.hasRecentReminder(
          r.userId,
          'hse_permit',
          r.permitId,
          type,
          ReminderService.DEDUP_MS,
        )
      )
        continue;
      const overdue = this.isOverdue(r.validUntil);
      const num = r.permitNumber ? ` №${r.permitNumber}` : '';
      await this.notifications.createNotification(r.accountId, {
        userId: r.userId,
        title: overdue ? 'Просрочен наряд-допуск' : 'Истекает наряд-допуск',
        message: `Наряд-допуск${num} — действует до ${this.fmt(r.validUntil)}`,
        notificationType: type,
        entityType: 'hse_permit',
        entityId: r.permitId,
        channels: ['in_app', 'push'],
        priority: 3,
        actionUrl: '/dashboard/hse',
      });
      created++;
    }
    return created;
  }

  private async scanSupplierOrders(): Promise<number> {
    const rows = await this.repo.findDueSupplierOrderReminders();
    let created = 0;
    for (const r of rows) {
      const type = 'supplier_order_reminder';
      if (
        await this.repo.hasRecentReminder(
          r.userId,
          'supplier_order',
          r.orderId,
          type,
          ReminderService.DEDUP_MS,
        )
      )
        continue;
      const overdue = this.isOverdue(r.expectedDate);
      await this.notifications.createNotification(r.accountId, {
        userId: r.userId,
        title: overdue ? 'Просрочена поставка' : 'Скоро поставка',
        message: `Заказ №${r.orderNumber} — поставка ${this.fmt(r.expectedDate)}`,
        notificationType: type,
        entityType: 'supplier_order',
        entityId: r.orderId,
        channels: ['in_app', 'push'],
        priority: overdue ? 3 : 2,
        actionUrl: '/dashboard/suppliers',
      });
      created++;
    }
    return created;
  }

  private async scanDocuments(): Promise<number> {
    const rows = await this.repo.findExpiringDocumentReminders(
      ReminderService.RENEWAL_WINDOW_DAYS,
    );
    let created = 0;
    for (const r of rows) {
      const type = 'document_expiry_reminder';
      if (
        await this.repo.hasRecentReminder(
          r.userId,
          'document',
          r.documentId,
          type,
          ReminderService.DEDUP_MS,
        )
      )
        continue;
      const overdue = this.isOverdue(r.expiryDate);
      await this.notifications.createNotification(r.accountId, {
        userId: r.userId,
        title: overdue ? 'Документ просрочен' : 'Истекает документ',
        message: `«${r.title}» — действует до ${this.fmt(r.expiryDate)}`,
        notificationType: type,
        entityType: 'document',
        entityId: r.documentId,
        channels: ['in_app', 'push'],
        priority: overdue ? 3 : 2,
        actionUrl: '/dashboard/documents',
      });
      created++;
    }
    return created;
  }

  private async scanClientFollowups(): Promise<number> {
    const rows = await this.repo.findDueClientFollowupReminders();
    let created = 0;
    for (const r of rows) {
      const type = 'client_followup_reminder';
      if (
        await this.repo.hasRecentReminder(
          r.userId,
          'client_interaction',
          r.interactionId,
          type,
          ReminderService.DEDUP_MS,
        )
      )
        continue;
      const action = r.nextAction ? `: ${r.nextAction}` : '';
      await this.notifications.createNotification(r.accountId, {
        userId: r.userId,
        title: 'Напоминание по клиенту',
        message: `${r.clientName} — ${this.fmt(r.nextActionDate)}${action}`,
        notificationType: type,
        entityType: 'client_interaction',
        entityId: r.interactionId,
        channels: ['in_app', 'push'],
        priority: 2,
        actionUrl: '/dashboard/clients',
      });
      created++;
    }
    return created;
  }
}
