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

// Технадзор не показывает служебный ID — только в этом разделе (базовые
// ADMIN_MODULES остаются нетронутыми: они переиспользуются на страницах
// inspector/foreman/pm/worker, где колонка ID нужна как есть).
const withoutId = (base: CrudModuleConfig): Partial<CrudModuleConfig> => ({
  columns: base.columns.filter((c) => c.key !== 'id'),
});

// ─── Инспекции ───
export const technadzorInspectionConfigs = {
  // «Мои инспекции» — основной рабочий список (все инспекции аккаунта, как на макете)
  mine: () =>
    withVariant(ADMIN_MODULES.inspections, {
      title: 'Мои инспекции',
      ...withoutId(ADMIN_MODULES.inspections),
    }),
  // «Назначенные мне» — где текущий пользователь инспектор
  assigned: () =>
    withVariant(ADMIN_MODULES.inspections, {
      title: 'Назначенные мне',
      listParams: { mine: 1 },
      ...withoutId(ADMIN_MODULES.inspections),
    }),
  control: () =>
    withVariant(ADMIN_MODULES.inspections, {
      title: 'На контроле',
      // статус «В процессе» — то, что под наблюдением до завершения
      listParams: { status: 1 },
      canCreate: false,
      ...withoutId(ADMIN_MODULES.inspections),
    }),
  all: () =>
    withVariant(ADMIN_MODULES.inspections, {
      title: 'Все инспекции',
      ...withoutId(ADMIN_MODULES.inspections),
    }),
};

// ─── Дефекты ───
export const technadzorDefectConfigs = {
  all: () =>
    withVariant(ADMIN_MODULES.defects, {
      title: 'Все дефекты',
      ...withoutId(ADMIN_MODULES.defects),
    }),
  assigned: () =>
    withVariant(ADMIN_MODULES.defects, {
      title: 'Назначенные мне',
      listParams: { assignedToMe: 1 },
      ...withoutId(ADMIN_MODULES.defects),
    }),
  control: () =>
    withVariant(ADMIN_MODULES.defects, {
      title: 'На контроле',
      // открытые/в работе дефекты под наблюдением
      listParams: { status: 0 },
      canCreate: false,
      ...withoutId(ADMIN_MODULES.defects),
    }),
};

// ─── Объекты (стройплощадки из projects-service) ───
export const technadzorObjectsConfig = () =>
  withVariant(ADMIN_MODULES['construction-sites'], {
    title: 'Объекты',
    ...withoutId(ADMIN_MODULES['construction-sites']),
  });

// ─── Шаблоны инспекций (inspections-service) ───
export const technadzorTemplatesConfig = () =>
  withVariant(ADMIN_MODULES['inspection-templates'], {
    title: 'Шаблоны инспекций',
    ...withoutId(ADMIN_MODULES['inspection-templates']),
  });

// ─── Подрядчики (suppliers-service) ───
export const technadzorContractorsConfig = () =>
  withVariant(ADMIN_MODULES.contractors, {
    title: 'Подрядчики',
    ...withoutId(ADMIN_MODULES.contractors),
  });
