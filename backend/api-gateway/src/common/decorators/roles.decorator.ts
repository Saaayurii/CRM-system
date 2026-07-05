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
