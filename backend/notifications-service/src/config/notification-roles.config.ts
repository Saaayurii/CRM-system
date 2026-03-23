/**
 * Role IDs:
 * 1 = super_admin, 2 = admin, 3 = hr_manager, 4 = project_manager
 * 5 = foreman, 6 = supplier_manager, 7 = warehouse_keeper, 8 = accountant
 * 9 = inspector, 10 = worker, 11 = supplier, 12 = contractor
 * 13 = observer, 14 = analyst
 *
 * Maps notification_type → array of roleIds that should receive push for this type.
 * An empty array means "all roles". Omitted types follow default push logic.
 */

const ALL_ROLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export const ROLE_NOTIFICATION_MAP: Record<string, number[]> = {
  // ── System & Auth ──────────────────────────────────────────────
  announcement:          ALL_ROLES,
  mention:               ALL_ROLES,
  chat_message:          ALL_ROLES,
  system_alert:          [1, 2],
  registration_request:  [1, 2],
  user_registered:       [1, 2, 3],

  // ── HR ────────────────────────────────────────────────────────
  employee_added:        [1, 2, 3],
  employee_deactivated:  [1, 2, 3],
  leave_request:         [3, 4],
  payroll_processed:     [3, 8],
  training_assigned:     [3, 5, 10],
  training_completed:    [3],

  // ── Projects & Tasks ──────────────────────────────────────────
  task_assigned:         [4, 5, 10],
  task_updated:          [4, 5],
  task_completed:        [4, 5],
  task_overdue:          [1, 2, 4, 5],
  project_created:       [1, 2, 4],
  project_milestone:     [1, 2, 4, 13],
  project_status_changed:[1, 2, 4, 13, 14],
  schedule_changed:      [5, 10],

  // ── Materials & Supply ────────────────────────────────────────
  material_low_stock:    [4, 5, 6, 7],
  material_received:     [4, 5, 6, 7],
  material_order_created:[6, 7],
  purchase_order:        [6, 7],
  supplier_response:     [6],

  // ── Finance ───────────────────────────────────────────────────
  payment_received:      [1, 2, 8],
  payment_overdue:       [1, 2, 4, 8],
  budget_exceeded:       [1, 2, 4, 8],
  invoice_created:       [8],
  contract_updated:      [1, 2, 4, 8, 12],

  // ── Quality & Inspections ─────────────────────────────────────
  inspection_created:    [4, 5, 9],
  inspection_failed:     [1, 2, 4, 9],
  defect_found:          [4, 5, 9],

  // ── Equipment ─────────────────────────────────────────────────
  equipment_maintenance_due: [4, 5, 7],
  equipment_assigned:        [5, 10],

  // ── Documents ─────────────────────────────────────────────────
  document_uploaded:     [4, 13],
  document_approved:     [4],
};

/**
 * Returns true when a notification of the given type should be pushed
 * to a user with the given roleId. If the type is not in the map,
 * we fall back to pushing to admins + the assigned user (roleId = null means always send).
 */
export function shouldPushToRole(
  notificationType: string | undefined,
  roleId: number | undefined,
): boolean {
  if (!notificationType || roleId === undefined) return true;
  const allowed = ROLE_NOTIFICATION_MAP[notificationType];
  if (!allowed) return true; // unknown type → always push
  return allowed.includes(roleId);
}
