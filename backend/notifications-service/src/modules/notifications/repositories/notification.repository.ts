import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class NotificationRepository {
  private readonly logger = new Logger(NotificationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllNotifications(
    accountId: number,
    userId: number,
    page: number = 1,
    limit: number = 20,
    isRead?: boolean,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { accountId, userId };
    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const [data, total] = await Promise.all([
      (this.prisma as any).notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).notification.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findNotificationById(id: number, accountId: number) {
    return (this.prisma as any).notification.findFirst({
      where: { id, accountId },
    });
  }

  async createNotification(data: any) {
    return (this.prisma as any).notification.create({ data });
  }

  /** All notifications linked to a given entity (id + userId, for SSE cleanup). */
  async findByEntity(entityType: string, entityId: number) {
    return (this.prisma as any).notification.findMany({
      where: { entityType, entityId },
      select: { id: true, userId: true },
    });
  }

  async deleteByEntity(entityType: string, entityId: number) {
    return (this.prisma as any).notification.deleteMany({
      where: { entityType, entityId },
    });
  }

  /** Уведомления о сообщениях одного чат-канала у одного пользователя. */
  async findChatMessageNotifications(userId: number, actionUrl: string) {
    return (this.prisma as any).notification.findMany({
      where: { userId, notificationType: 'chat_message', actionUrl },
      select: { id: true },
    });
  }

  async deleteByIds(ids: number[]) {
    if (ids.length === 0) return { count: 0 };
    return (this.prisma as any).notification.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async updateNotification(id: number, accountId: number, data: any) {
    return (this.prisma as any).notification.updateMany({
      where: { id, accountId },
      data,
    });
  }

  async markAsRead(id: number, accountId: number) {
    return (this.prisma as any).notification.updateMany({
      where: { id, accountId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async deleteAllForUser(userId: number, accountId: number): Promise<number[]> {
    const rows = await (this.prisma as any).notification.findMany({
      where: { userId, accountId },
      select: { id: true },
    });
    const ids: number[] = rows.map((r: { id: number }) => r.id);
    if (ids.length > 0) {
      await (this.prisma as any).notification.deleteMany({
        where: { userId, accountId },
      });
    }
    return ids;
  }

  async deleteAllPushSubscriptionsForUser(userId: number): Promise<void> {
    await (this.prisma as any).pushSubscription.deleteMany({ where: { userId } });
  }

  async countNotifications(
    accountId: number,
    userId: number,
    isRead?: boolean,
  ) {
    const where: any = { accountId, userId };
    if (isRead !== undefined) {
      where.isRead = isRead;
    }
    return (this.prisma as any).notification.count({ where });
  }

  async findAllAnnouncements(
    accountId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const where = { accountId };

    const [data, total] = await Promise.all([
      (this.prisma as any).announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      }),
      (this.prisma as any).announcement.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAnnouncementById(id: number, accountId: number) {
    return (this.prisma as any).announcement.findFirst({
      where: { id, accountId },
    });
  }

  async createAnnouncement(data: any) {
    return (this.prisma as any).announcement.create({ data });
  }

  async updateAnnouncement(id: number, accountId: number, data: any) {
    return (this.prisma as any).announcement.updateMany({
      where: { id, accountId },
      data,
    });
  }

  async deleteAnnouncement(id: number, accountId: number) {
    return (this.prisma as any).announcement.deleteMany({
      where: { id, accountId },
    });
  }

  async countAnnouncements(accountId: number) {
    return (this.prisma as any).announcement.count({
      where: { accountId },
    });
  }

  // --- Push Subscriptions ---

  async savePushSubscription(data: {
    userId: number;
    accountId: number;
    roleId?: number;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
  }) {
    // A browser/device endpoint is unique to one device. If the same endpoint
    // is still registered to a different user (e.g. the previous account on a
    // shared device), drop those rows so pushes don't leak across accounts.
    await (this.prisma as any).pushSubscription.deleteMany({
      where: { endpoint: data.endpoint, userId: { not: data.userId } },
    });

    return (this.prisma as any).pushSubscription.upsert({
      where: {
        userId_endpoint: { userId: data.userId, endpoint: data.endpoint },
      },
      update: {
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent,
        roleId: data.roleId,
      },
      create: data,
    });
  }

  async deletePushSubscription(userId: number, endpoint: string) {
    return (this.prisma as any).pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
  }

  async getPushSubscriptionsByUserId(userId: number) {
    return (this.prisma as any).pushSubscription.findMany({
      where: { userId },
    });
  }

  async getPushSubscriptionsByAccountAndRole(
    accountId: number,
    roleIds: number[],
  ) {
    return (this.prisma as any).pushSubscription.findMany({
      where: { accountId, roleId: { in: roleIds } },
    });
  }

  /** Active (non-deleted) user IDs in an account having any of the given roles */
  async findUserIdsByRoles(
    accountId: number,
    roleIds: number[],
  ): Promise<number[]> {
    const users = await (this.prisma as any).user.findMany({
      where: {
        accountId,
        roleId: { in: roleIds },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    return users.map((u: { id: number }) => u.id);
  }

  // --- Housekeeping & reminders ---

  /** Delete read notifications older than `days`. Returns rows removed. */
  async deleteReadOlderThan(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const res = await (this.prisma as any).notification.deleteMany({
      where: { isRead: true, createdAt: { lt: cutoff } },
    });
    return res.count ?? 0;
  }

  /** True if a reminder for this entity was already created for the user recently (dedup). */
  async hasRecentReminder(
    userId: number,
    entityType: string,
    entityId: number,
    notificationType: string,
    sinceMs: number,
  ): Promise<boolean> {
    const since = new Date(Date.now() - sinceMs);
    const count = await (this.prisma as any).notification.count({
      where: { userId, entityType, entityId, notificationType, createdAt: { gte: since } },
    });
    return count > 0;
  }

  /**
   * Active tasks due within a day (or overdue), one row per recipient
   * (assignees, falling back to the single assigned user). Cross-domain read
   * over the shared DB via raw SQL — tasks aren't modeled in this service.
   */
  async findDueTaskReminders(): Promise<
    Array<{ taskId: number; accountId: number; title: string; dueDate: Date; userId: number }>
  > {
    return (this.prisma as any).$queryRawUnsafe(`
      SELECT t.id AS "taskId", t.account_id AS "accountId", t.title AS "title",
             t.due_date AS "dueDate",
             COALESCE(ta.user_id, t.assigned_to_user_id) AS "userId"
      FROM tasks t
      LEFT JOIN task_assignees ta ON ta.task_id = t.id
      WHERE t.deleted_at IS NULL
        AND t.status NOT IN (4, 5)
        AND t.due_date IS NOT NULL
        AND t.due_date <= CURRENT_DATE + INTERVAL '1 day'
        AND COALESCE(ta.user_id, t.assigned_to_user_id) IS NOT NULL
    `);
  }

  /** Pending inspections scheduled within a day (or overdue) → notify the inspector. */
  async findDueInspectionReminders(): Promise<
    Array<{ inspectionId: number; accountId: number; scheduledDate: Date; userId: number; projectName: string | null }>
  > {
    return (this.prisma as any).$queryRawUnsafe(`
      SELECT i.id AS "inspectionId", i.account_id AS "accountId",
             i.scheduled_date AS "scheduledDate", i.inspector_id AS "userId",
             p.name AS "projectName"
      FROM inspections i
      LEFT JOIN projects p ON p.id = i.project_id
      WHERE i.status IN (0, 1)
        AND i.scheduled_date IS NOT NULL
        AND i.scheduled_date <= CURRENT_DATE + INTERVAL '1 day'
        AND i.inspector_id IS NOT NULL
    `);
  }

  /** Equipment whose maintenance is due within a day (or overdue) → notify the assigned user. */
  async findDueEquipmentReminders(): Promise<
    Array<{ equipmentId: number; accountId: number; name: string; dueDate: Date; userId: number }>
  > {
    return (this.prisma as any).$queryRawUnsafe(`
      SELECT e.id AS "equipmentId", e.account_id AS "accountId", e.name AS "name",
             e.next_maintenance_date AS "dueDate", e.assigned_to_user_id AS "userId"
      FROM equipment e
      WHERE e.next_maintenance_date IS NOT NULL
        AND e.next_maintenance_date <= CURRENT_DATE + INTERVAL '1 day'
        AND e.assigned_to_user_id IS NOT NULL
    `);
  }

  /** Calendar events starting within the next day → notify the organizer. */
  async findUpcomingCalendarReminders(): Promise<
    Array<{ eventId: number; accountId: number; title: string; startAt: Date; userId: number }>
  > {
    return (this.prisma as any).$queryRawUnsafe(`
      SELECT c.id AS "eventId", c.account_id AS "accountId", c.title AS "title",
             c.start_datetime AS "startAt", c.organizer_id AS "userId"
      FROM calendar_events c
      WHERE c.organizer_id IS NOT NULL
        AND c.start_datetime >= NOW()
        AND c.start_datetime <= NOW() + INTERVAL '1 day'
    `);
  }

  /**
   * Safety-training certificates expiring within `days` (or already expired).
   * Considers only the latest record per (user, training) so renewed certs
   * don't trigger on an old expired row. → notify the employee.
   */
  async findExpiringTrainingReminders(days: number): Promise<
    Array<{ trainingId: number; accountId: number; name: string; expiryDate: Date; userId: number }>
  > {
    return (this.prisma as any).$queryRawUnsafe(`
      SELECT * FROM (
        SELECT DISTINCT ON (r.user_id, r.safety_training_id)
          r.safety_training_id AS "trainingId", r.user_id AS "userId",
          r.expiry_date AS "expiryDate", st.account_id AS "accountId",
          st.training_name AS "name"
        FROM safety_training_records r
        JOIN safety_trainings st ON st.id = r.safety_training_id
        WHERE r.expiry_date IS NOT NULL
        ORDER BY r.user_id, r.safety_training_id, r.expiry_date DESC
      ) latest
      WHERE latest."expiryDate" <= CURRENT_DATE + INTERVAL '${days} days'
    `);
  }

  /**
   * Safety briefings whose validity expires within `days` (or expired).
   * Latest signed briefing per user only. → notify the employee.
   */
  async findExpiringBriefingReminders(days: number): Promise<
    Array<{ briefingId: number; accountId: number; title: string; validUntil: Date; userId: number }>
  > {
    return (this.prisma as any).$queryRawUnsafe(`
      SELECT * FROM (
        SELECT DISTINCT ON (p.user_id)
          p.briefing_id AS "briefingId", p.user_id AS "userId",
          p.valid_until AS "validUntil", b.account_id AS "accountId", b.title AS "title"
        FROM safety_briefing_participants p
        JOIN safety_briefings b ON b.id = p.briefing_id
        WHERE p.valid_until IS NOT NULL
          AND p.status = 'signed'
          AND b.deleted_at IS NULL
        ORDER BY p.user_id, p.valid_until DESC
      ) latest
      WHERE latest."validUntil" <= CURRENT_DATE + INTERVAL '${days} days'
    `);
  }

  /** Active HSE permits expiring within `days` (or expired) → notify the requester. */
  async findExpiringHsePermitReminders(days: number): Promise<
    Array<{ permitId: number; accountId: number; permitNumber: string | null; validUntil: Date; userId: number }>
  > {
    return (this.prisma as any).$queryRawUnsafe(`
      SELECT h.id AS "permitId", h.account_id AS "accountId",
             h.permit_number AS "permitNumber", h.valid_until AS "validUntil",
             h.requested_by_user_id AS "userId"
      FROM hse_permits h
      WHERE h.deleted_at IS NULL
        AND h.requested_by_user_id IS NOT NULL
        AND h.status IN ('approved', 'active')
        AND h.valid_until <= CURRENT_DATE + INTERVAL '${days} days'
    `);
  }

  /** Supplier orders whose expected delivery is within a day (or overdue) → notify the creator. */
  async findDueSupplierOrderReminders(): Promise<
    Array<{ orderId: number; accountId: number; orderNumber: string; expectedDate: Date; userId: number }>
  > {
    return (this.prisma as any).$queryRawUnsafe(`
      SELECT o.id AS "orderId", o.account_id AS "accountId",
             o.order_number AS "orderNumber", o.expected_delivery_date AS "expectedDate",
             o.created_by_user_id AS "userId"
      FROM supplier_orders o
      WHERE o.deleted_at IS NULL
        AND o.created_by_user_id IS NOT NULL
        AND o.status IN (1, 2, 3)
        AND o.expected_delivery_date IS NOT NULL
        AND o.expected_delivery_date <= CURRENT_DATE + INTERVAL '1 day'
    `);
  }

  /** Documents (contracts/licenses) expiring within `days` (or expired) → notify the uploader. */
  async findExpiringDocumentReminders(days: number): Promise<
    Array<{ documentId: number; accountId: number; title: string; expiryDate: Date; userId: number }>
  > {
    return (this.prisma as any).$queryRawUnsafe(`
      SELECT d.id AS "documentId", d.account_id AS "accountId", d.title AS "title",
             d.expiry_date AS "expiryDate", d.uploaded_by_user_id AS "userId"
      FROM documents d
      WHERE d.deleted_at IS NULL
        AND d.uploaded_by_user_id IS NOT NULL
        AND COALESCE(d.status, '') <> 'archived'
        AND d.expiry_date IS NOT NULL
        AND d.expiry_date <= CURRENT_DATE + INTERVAL '${days} days'
    `);
  }

  /** Client interactions with a follow-up date within a day (or overdue) → notify the manager who logged it. */
  async findDueClientFollowupReminders(): Promise<
    Array<{ interactionId: number; accountId: number; clientName: string; nextAction: string | null; nextActionDate: Date; userId: number }>
  > {
    return (this.prisma as any).$queryRawUnsafe(`
      SELECT ci.id AS "interactionId", c.account_id AS "accountId",
             COALESCE(NULLIF(TRIM(CONCAT_WS(' ', c.last_name, c.first_name)), ''), c.company_name, 'Клиент') AS "clientName",
             ci.next_action AS "nextAction", ci.next_action_date AS "nextActionDate",
             ci.user_id AS "userId"
      FROM client_interactions ci
      JOIN clients c ON c.id = ci.client_id
      WHERE ci.user_id IS NOT NULL
        AND ci.next_action_date IS NOT NULL
        AND ci.next_action_date <= CURRENT_DATE + INTERVAL '1 day'
    `);
  }

  /**
   * Active employees whose birthday (month + day of `birth_date`) is today.
   * Excludes deleted/inactive users and the client-portal role (15) — we only
   * celebrate staff. Feb-29 birthdays simply don't fire on non-leap years.
   */
  async findTodayBirthdayUsers(): Promise<
    Array<{ userId: number; accountId: number; name: string }>
  > {
    return (this.prisma as any).$queryRawUnsafe(`
      SELECT u.id AS "userId", u.account_id AS "accountId",
             COALESCE(NULLIF(TRIM(u.name), ''), 'Сотрудник') AS "name"
      FROM users u
      WHERE u.birth_date IS NOT NULL
        AND u.deleted_at IS NULL
        AND u.is_active = TRUE
        AND COALESCE(u.role_id, 0) <> 15
        AND EXTRACT(MONTH FROM u.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM u.birth_date) = EXTRACT(DAY FROM CURRENT_DATE)
    `);
  }

  /** IDs of active staff in an account (for fan-out of a colleague's birthday). */
  async findAccountColleagueIds(accountId: number): Promise<number[]> {
    const rows: Array<{ userId: number }> = await (this.prisma as any).$queryRawUnsafe(
      `
      SELECT u.id AS "userId"
      FROM users u
      WHERE u.account_id = $1
        AND u.deleted_at IS NULL
        AND u.is_active = TRUE
        AND COALESCE(u.role_id, 0) <> 15
    `,
      accountId,
    );
    return rows.map((r) => r.userId);
  }
}
