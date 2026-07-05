import { SetMetadata } from '@nestjs/common';

export const ROLE_IDS_KEY = 'gateway_role_ids';

/**
 * Restricts a route to users whose roleId is in the provided list.
 * Uses numeric role IDs from the JWT — no DB lookup required.
 *
 * Predefined role IDs:
 *   1  super_admin   2  admin         3  hr_manager
 *   4  project_manager 5 foreman      6  supplier_manager
 *   7  warehouse_keeper 8 accountant  9  inspector
 *   10 worker        11 supplier      12 contractor
 *   13 observer      14 analyst       15 client
 */
export const Roles = (...roleIds: number[]) =>
  SetMetadata(ROLE_IDS_KEY, roleIds);

/** Allow any authenticated user regardless of role (use as class-level default). */
export const AnyRole = () => SetMetadata(ROLE_IDS_KEY, [] as number[]);

// ─── Role group constants ────────────────────────────────────────────────────

/** All internal company employees (includes worker=10, observer=13; excludes external=11,12 and client=15). */
export const ALL_INTERNAL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14];

/** Commercial / CRM roles — clients, deals, interactions. */
export const CRM_ROLES = [1, 2, 3, 4, 6, 8, 14];

/** Management + analytics (no field workers, no external). */
export const MANAGEMENT_ROLES = [1, 2, 3, 4, 8, 14];

/** Admin only. */
export const ADMIN_ROLES = [1, 2];

/** Project-management writes (create/delete projects). */
export const PM_ROLES = [1, 2, 4];

/** Roles allowed to create/update/delete documents. */
export const DOC_WRITE_ROLES = [1, 2, 3, 4, 8];

/** Roles that may read accessLevel=restricted documents. */
export const RESTRICTED_DOC_ROLES = [1, 2, 3, 4, 8, 14];
