// Whitelist: какие типы сущностей можно открывать по публичной шаре-ссылке и
// куда за ними ходить. Добавление нового типа = одна строка здесь.
// service — ключ из ProxyService.serviceUrls; path — построитель пути в сервисе.
export interface ShareTarget {
  service: string;
  path: (id: number) => string;
  // Человекочитаемая подпись типа (для публичной страницы).
  label: string;
}

export const SHARE_REGISTRY: Record<string, ShareTarget> = {
  project: {
    service: 'projects',
    path: (id) => `/projects/${id}`,
    label: 'Проект',
  },
  'construction-site': {
    service: 'projects',
    path: (id) => `/construction-sites/${id}`,
    label: 'Объект',
  },
  'site-plan': {
    service: 'inspections',
    path: (id) => `/site-plans/${id}`,
    label: 'План / чертёж',
  },
  inspection: {
    service: 'inspections',
    path: (id) => `/inspections/${id}`,
    label: 'Инспекция',
  },
  defect: {
    service: 'inspections',
    path: (id) => `/defects/${id}`,
    label: 'Дефект',
  },
  deal: {
    service: 'clients',
    path: (id) => `/deals/${id}`,
    label: 'Сделка',
  },
  client: {
    service: 'clients',
    path: (id) => `/clients/${id}`,
    label: 'Клиент',
  },
  document: {
    service: 'documents',
    path: (id) => `/documents/${id}`,
    label: 'Документ',
  },
  'generated-report': {
    service: 'reports',
    path: (id) => `/generated-reports/${id}`,
    label: 'Отчёт',
  },
  task: {
    service: 'tasks',
    path: (id) => `/tasks/${id}`,
    label: 'Задача',
  },
  equipment: {
    service: 'equipment',
    path: (id) => `/equipment/${id}`,
    label: 'Техника',
  },
  material: {
    service: 'materials',
    path: (id) => `/materials/${id}`,
    label: 'Материал',
  },
  supplier: {
    service: 'suppliers',
    path: (id) => `/suppliers/${id}`,
    label: 'Поставщик',
  },
  budget: {
    service: 'finance',
    path: (id) => `/budgets/${id}`,
    label: 'Бюджет',
  },
  'wiki-page': {
    service: 'wiki',
    path: (id) => `/wiki-pages/${id}`,
    label: 'Wiki-страница',
  },
  'calendar-event': {
    service: 'calendar',
    path: (id) => `/calendar-events/${id}`,
    label: 'Событие',
  },
};
