import type { CrudModuleConfig } from '@/types/admin';
import { ADMIN_MODULES } from './modulesConfig';

/**
 * Варианты CRUD-конфигов для раздела «Технадзор».
 * Переиспользуем готовые ADMIN_MODULES (inspections / defects / construction-sites),
 * меняя только title и listParams (серверные фильтры mine/assignedToMe/status).
 * apiEndpoint остаётся чистым — update/delete по `/:id` не ломаются.
 */
function withVariant(
  base: CrudModuleConfig,
  overrides: Partial<CrudModuleConfig>,
): CrudModuleConfig {
  return { ...base, ...overrides };
}

// ─── Инспекции ───
export const technadzorInspectionConfigs = {
  mine: () =>
    withVariant(ADMIN_MODULES.inspections, {
      title: 'Мои инспекции',
      listParams: { mine: 1 },
    }),
  assigned: () =>
    withVariant(ADMIN_MODULES.inspections, {
      title: 'Назначенные мне',
      listParams: { mine: 1 },
    }),
  control: () =>
    withVariant(ADMIN_MODULES.inspections, {
      title: 'На контроле',
      // статус «В процессе» — то, что под наблюдением до завершения
      listParams: { status: 1 },
      canCreate: false,
    }),
  all: () =>
    withVariant(ADMIN_MODULES.inspections, {
      title: 'Все инспекции',
    }),
};

// ─── Дефекты ───
export const technadzorDefectConfigs = {
  all: () =>
    withVariant(ADMIN_MODULES.defects, {
      title: 'Все дефекты',
    }),
  assigned: () =>
    withVariant(ADMIN_MODULES.defects, {
      title: 'Назначенные мне',
      listParams: { assignedToMe: 1 },
    }),
  control: () =>
    withVariant(ADMIN_MODULES.defects, {
      title: 'На контроле',
      // открытые/в работе дефекты под наблюдением
      listParams: { status: 0 },
      canCreate: false,
    }),
};

// ─── Объекты (стройплощадки из projects-service) ───
export const technadzorObjectsConfig = () =>
  withVariant(ADMIN_MODULES['construction-sites'], {
    title: 'Объекты',
  });

// ─── Шаблоны инспекций (inspections-service) ───
export const technadzorTemplatesConfig = () =>
  withVariant(ADMIN_MODULES['inspection-templates'], {
    title: 'Шаблоны инспекций',
  });

// ─── Подрядчики (suppliers-service) ───
export const technadzorContractorsConfig = () =>
  withVariant(ADMIN_MODULES.contractors, {
    title: 'Подрядчики',
  });
