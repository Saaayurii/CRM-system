import { PrismaService } from '../../database/prisma.service';

export const CLIENT_ROLE_ID = 15;

export interface RequestUser {
  id: number;
  roleId: number;
  accountId: number;
  clientId?: number;
}

/**
 * Если пользователь — клиент портала (roleId=15), возвращает список id проектов,
 * к которым у него есть активный доступ. Для остальных ролей возвращает undefined
 * (фильтрация по проектам не применяется).
 */
export async function getClientAllowedProjectIds(
  prisma: PrismaService,
  user: RequestUser,
): Promise<number[] | undefined> {
  if (user.roleId !== CLIENT_ROLE_ID) return undefined;

  const rows = await prisma.$queryRaw<Array<{ project_id: number }>>`
    SELECT DISTINCT project_id
    FROM client_portal_access
    WHERE user_id = ${user.id}
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  `;
  return rows.map((r) => r.project_id);
}
