import { PrismaService } from '../../database/prisma.service';

export const CLIENT_ROLE_ID = 15;

export interface RequestUser {
  id: number;
  roleId: number;
  accountId: number;
  clientId?: number;
}

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

/**
 * Может ли клиент видеть финансовые данные данного проекта.
 * Проверяет флаг canViewFinancials в client_portal_access.
 */
export async function clientCanViewFinancials(
  prisma: PrismaService,
  user: RequestUser,
  projectId: number,
): Promise<boolean> {
  if (user.roleId !== CLIENT_ROLE_ID) return true;
  const rows = await prisma.$queryRaw<Array<{ can_view_financials: boolean }>>`
    SELECT can_view_financials
    FROM client_portal_access
    WHERE user_id = ${user.id}
      AND project_id = ${projectId}
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1
  `;
  return rows[0]?.can_view_financials === true;
}

// Поля, которые клиент в портале НЕ должен видеть, даже если получил
// доступ к финансам — это внутренняя кухня компании.
const INTERNAL_PAYMENT_FIELDS = [
  'cashLocation',
  'bankName',
  'counterpartyType',
  'supplierId',
  'contractorId',
  'supplierOrderId',
  'notes',
  'createdByUserId',
  'approvedByUserId',
  'documents',
  'paymentAccountId',
  'paymentAccount',
] as const;

const INTERNAL_ACT_FIELDS = [
  'contractorId',
  'preparedByUserId',
  'approvedByUserId',
  'notes',
  'documents',
] as const;

function strip<T extends Record<string, any>>(obj: T, fields: readonly string[]): T {
  if (!obj || typeof obj !== 'object') return obj;
  const copy: any = { ...obj };
  for (const f of fields) delete copy[f];
  return copy;
}

/** Прячет внутренние поля платежа для клиента. */
export function sanitizePaymentForClient<T extends Record<string, any>>(
  user: RequestUser,
  payment: T,
): T {
  if (user.roleId !== CLIENT_ROLE_ID) return payment;
  return strip(payment, INTERNAL_PAYMENT_FIELDS);
}

/** Прячет внутренние поля акта для клиента. */
export function sanitizeActForClient<T extends Record<string, any>>(
  user: RequestUser,
  act: T,
): T {
  if (user.roleId !== CLIENT_ROLE_ID) return act;
  return strip(act, INTERNAL_ACT_FIELDS);
}
