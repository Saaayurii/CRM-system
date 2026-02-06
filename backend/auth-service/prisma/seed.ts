import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed roles from CRM.sql
  const roles = [
    {
      name: 'Супер Администратор',
      code: 'super_admin',
      description: 'Полный доступ ко всем модулям',
      permissions: { all: 'full' },
    },
    {
      name: 'Администратор',
      code: 'admin',
      description: 'Управление системой и пользователями',
      permissions: { all: 'full', system: 'manage' },
    },
    {
      name: 'HR Менеджер',
      code: 'hr_manager',
      description: 'Управление персоналом',
      permissions: { hr: 'full', communications: 'full', calendar: 'full' },
    },
    {
      name: 'Менеджер проектов',
      code: 'project_manager',
      description: 'Управление проектами',
      permissions: { projects: 'full', tasks: 'full', reports: 'view', budget: 'view' },
    },
    {
      name: 'Прораб',
      code: 'foreman',
      description: 'Управление объектом',
      permissions: { tasks: 'full', inspections: 'full', materials: 'request', workers: 'manage' },
    },
    {
      name: 'Снабженец',
      code: 'supplier_manager',
      description: 'Управление снабжением',
      permissions: { materials: 'full', suppliers: 'full', orders: 'full' },
    },
    {
      name: 'Кладовщик',
      code: 'warehouse_keeper',
      description: 'Управление складом',
      permissions: { warehouse: 'full', materials: 'view', receiving: 'full' },
    },
    {
      name: 'Бухгалтер',
      code: 'accountant',
      description: 'Финансовый учёт',
      permissions: { finance: 'full', payments: 'full', acts: 'full', budget: 'full' },
    },
    {
      name: 'Инспектор',
      code: 'inspector',
      description: 'Контроль качества',
      permissions: { inspections: 'full', defects: 'full', quality: 'full' },
    },
    {
      name: 'Рабочий',
      code: 'worker',
      description: 'Выполнение задач',
      permissions: { tasks: 'own', materials: 'view' },
    },
    {
      name: 'Поставщик',
      code: 'supplier',
      description: 'Внешний поставщик',
      permissions: { orders: 'own', deliveries: 'own' },
    },
    {
      name: 'Подрядчик',
      code: 'contractor',
      description: 'Внешний подрядчик',
      permissions: { tasks: 'own', acts: 'own', payments: 'view' },
    },
    {
      name: 'Наблюдатель',
      code: 'observer',
      description: 'Только просмотр',
      permissions: { all: 'view' },
    },
    {
      name: 'Аналитик',
      code: 'analyst',
      description: 'Отчёты и аналитика',
      permissions: { reports: 'full', analytics: 'full', all: 'view' },
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: {},
      create: role,
    });
  }

  console.log(`Seeded ${roles.length} roles`);

  // Seed default account for development
  const existingAccount = await prisma.account.findFirst({
    where: { subdomain: 'default' },
  });

  let defaultAccount;
  if (!existingAccount) {
    defaultAccount = await prisma.account.create({
      data: {
        name: 'Default Company',
        subdomain: 'default',
        status: 1,
        settings: {},
      },
    });
    console.log(`Created default account: ${defaultAccount.name}`);
  } else {
    defaultAccount = existingAccount;
    console.log(`Default account already exists: ${defaultAccount.name}`);
  }

  console.log(`Account ID: ${defaultAccount.id}`);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
