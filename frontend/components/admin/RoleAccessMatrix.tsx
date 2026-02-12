'use client';

const modules = ['Проекты', 'Задачи', 'Материалы', 'Склад', 'Финансы', 'HR', 'Инспекции', 'Отчёты'];

const ROLE_CODE_TO_NAME: Record<string, string> = {
  super_admin: 'Супер Администратор',
  admin: 'Администратор',
  director: 'Директор',
  deputy_director: 'Зам. директора',
  project_manager: 'Менеджер проектов',
  site_engineer: 'Инженер участка',
  foreman: 'Прораб',
  worker: 'Рабочий',
  accountant: 'Бухгалтер',
  hr_manager: 'HR Менеджер',
  warehouse_manager: 'Зав. складом',
  supplier_manager: 'Снабженец',
  safety_officer: 'Инженер по ТБ',
  inspector: 'Инспектор',
  analyst: 'Аналитик',
  observer: 'Наблюдатель',
  supplier: 'Поставщик',
  contractor: 'Подрядчик',
  client: 'Клиент',
  guest: 'Гость',
};

const ACCESS_TOOLTIPS: Record<string, string> = {
  full: 'Полный доступ',
  read: 'Только чтение',
  none: 'Нет доступа',
};

interface RoleAccess {
  role: string;
  access: Record<string, 'full' | 'read' | 'none'>;
}

const roles: RoleAccess[] = [
  { role: 'super_admin', access: Object.fromEntries(modules.map((m) => [m, 'full' as const])) },
  { role: 'director', access: Object.fromEntries(modules.map((m) => [m, 'full' as const])) },
  { role: 'deputy_director', access: { 'Проекты': 'full', 'Задачи': 'full', 'Материалы': 'full', 'Склад': 'full', 'Финансы': 'read', 'HR': 'read', 'Инспекции': 'full', 'Отчёты': 'full' } },
  { role: 'project_manager', access: { 'Проекты': 'full', 'Задачи': 'full', 'Материалы': 'read', 'Склад': 'read', 'Финансы': 'read', 'HR': 'none', 'Инспекции': 'full', 'Отчёты': 'read' } },
  { role: 'site_engineer', access: { 'Проекты': 'read', 'Задачи': 'full', 'Материалы': 'full', 'Склад': 'read', 'Финансы': 'none', 'HR': 'none', 'Инспекции': 'full', 'Отчёты': 'read' } },
  { role: 'foreman', access: { 'Проекты': 'read', 'Задачи': 'full', 'Материалы': 'read', 'Склад': 'read', 'Финансы': 'none', 'HR': 'none', 'Инспекции': 'read', 'Отчёты': 'none' } },
  { role: 'worker', access: { 'Проекты': 'none', 'Задачи': 'read', 'Материалы': 'none', 'Склад': 'none', 'Финансы': 'none', 'HR': 'none', 'Инспекции': 'none', 'Отчёты': 'none' } },
  { role: 'accountant', access: { 'Проекты': 'read', 'Задачи': 'none', 'Материалы': 'read', 'Склад': 'read', 'Финансы': 'full', 'HR': 'read', 'Инспекции': 'none', 'Отчёты': 'full' } },
  { role: 'hr_manager', access: { 'Проекты': 'none', 'Задачи': 'none', 'Материалы': 'none', 'Склад': 'none', 'Финансы': 'read', 'HR': 'full', 'Инспекции': 'none', 'Отчёты': 'read' } },
  { role: 'warehouse_manager', access: { 'Проекты': 'none', 'Задачи': 'none', 'Материалы': 'full', 'Склад': 'full', 'Финансы': 'none', 'HR': 'none', 'Инспекции': 'none', 'Отчёты': 'read' } },
  { role: 'safety_officer', access: { 'Проекты': 'read', 'Задачи': 'read', 'Материалы': 'none', 'Склад': 'none', 'Финансы': 'none', 'HR': 'none', 'Инспекции': 'full', 'Отчёты': 'read' } },
  { role: 'inspector', access: { 'Проекты': 'read', 'Задачи': 'read', 'Материалы': 'none', 'Склад': 'none', 'Финансы': 'none', 'HR': 'none', 'Инспекции': 'full', 'Отчёты': 'read' } },
  { role: 'client', access: { 'Проекты': 'read', 'Задачи': 'none', 'Материалы': 'none', 'Склад': 'none', 'Финансы': 'none', 'HR': 'none', 'Инспекции': 'read', 'Отчёты': 'read' } },
  { role: 'guest', access: { 'Проекты': 'none', 'Задачи': 'none', 'Материалы': 'none', 'Склад': 'none', 'Финансы': 'none', 'HR': 'none', 'Инспекции': 'none', 'Отчёты': 'none' } },
];

function AccessIcon({ level }: { level: 'full' | 'read' | 'none' }) {
  switch (level) {
    case 'full':
      return (
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 16 16">
          <title>{ACCESS_TOOLTIPS.full}</title>
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm3.78 4.97a.75.75 0 0 0-1.06 0L7 8.69 5.28 6.97a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l4.25-4.25a.75.75 0 0 0 0-1.06Z" />
        </svg>
      );
    case 'read':
      return (
        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 16 16">
          <title>{ACCESS_TOOLTIPS.read}</title>
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM5.5 7.5a.75.75 0 0 0 0 1.5h5a.75.75 0 0 0 0-1.5h-5Z" />
        </svg>
      );
    case 'none':
      return (
        <svg className="w-4 h-4 text-red-500/50" fill="currentColor" viewBox="0 0 16 16">
          <title>{ACCESS_TOOLTIPS.none}</title>
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm2.78 4.97a.75.75 0 0 0-1.06 0L8 6.69 6.28 4.97a.75.75 0 0 0-1.06 1.06L6.94 7.75 5.22 9.47a.75.75 0 1 0 1.06 1.06L8 8.81l1.72 1.72a.75.75 0 1 0 1.06-1.06L9.06 7.75l1.72-1.72a.75.75 0 0 0 0-1.06Z" />
        </svg>
      );
  }
}

export default function RoleAccessMatrix() {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table-auto w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
              <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">Роль</th>
              {modules.map((m) => (
                <th key={m} className="py-3 px-3 text-center font-semibold whitespace-nowrap">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {roles.map((r) => (
              <tr key={r.role} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                <td className="py-2.5 px-4 text-gray-800 dark:text-gray-100 font-medium whitespace-nowrap">
                  {ROLE_CODE_TO_NAME[r.role] || r.role}
                </td>
                {modules.map((m) => (
                  <td key={m} className="py-2.5 px-3 text-center">
                    <div className="flex justify-center">
                      <AccessIcon level={r.access[m] || 'none'} />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
