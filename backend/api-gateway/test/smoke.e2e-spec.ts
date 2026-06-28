/**
 * Smoke-тест всех ручек через живой api-gateway (чёрный ящик).
 *
 * Цель: убедиться, что каждый микросервис поднят и доступен через gateway —
 * ловит ровно тот класс поломок, что бьёт прод (сервис лёг / падает на старте /
 * отдаёт 500). НЕ проверяет бизнес-логику, только «ручка жива» (статус < 500).
 *
 * Запуск против любого окружения:
 *   SMOKE_BASE_URL=https://crm.3stroy15.pro \
 *   SMOKE_EMAIL=admin@crm.local SMOKE_PASSWORD='Password123!' \
 *   npm run test:smoke
 *
 * Без SMOKE_BASE_URL сьют пропускается (чтобы не падать в обычном `npm test`).
 */
import request from 'supertest';

const BASE_URL = process.env.SMOKE_BASE_URL || '';
const EMAIL = process.env.SMOKE_EMAIL || 'admin@crm.local';
const PASSWORD = process.env.SMOKE_PASSWORD || 'Password123!';

// По одной-две представительные GET-ручки на каждый из 24 сервисов.
// Список — реальные маршруты gateway (вытащены из контроллеров).
const ENDPOINTS: string[] = [
  '/api/v1/health',                       // gateway
  '/api/v1/auth/me',                      // auth
  '/api/v1/users',                        // users
  '/api/v1/projects',                     // projects
  '/api/v1/construction-sites',           // projects
  '/api/v1/tasks',                        // tasks
  '/api/v1/tasks/stats',                  // tasks
  '/api/v1/materials',                    // materials
  '/api/v1/material-categories',          // materials
  '/api/v1/warehouses',                   // materials
  '/api/v1/suppliers',                    // suppliers
  '/api/v1/contractors',                  // suppliers
  '/api/v1/supplier-orders',              // suppliers
  '/api/v1/payments',                     // finance
  '/api/v1/budgets',                      // finance
  '/api/v1/payment-accounts',             // finance
  '/api/v1/inspections',                  // inspections
  '/api/v1/defects',                      // inspections
  '/api/v1/inspection-templates',         // inspections
  '/api/v1/teams',                        // hr
  '/api/v1/attendance',                   // hr
  '/api/v1/employee-documents',           // hr
  '/api/v1/notifications',                // notifications
  '/api/v1/announcements',                // notifications
  '/api/v1/chat-channels',                // chat
  '/api/v1/calendar-events',              // calendar
  '/api/v1/equipment',                    // equipment
  '/api/v1/equipment-maintenance',        // equipment
  '/api/v1/documents',                    // documents
  '/api/v1/document-templates',           // documents
  '/api/v1/report-templates',             // reports
  '/api/v1/generated-reports',            // reports
  '/api/v1/dictionaries',                 // dictionary
  '/api/v1/dictionary-values',            // dictionary
  '/api/v1/event-logs',                   // audit
  '/api/v1/clients',                      // clients
  '/api/v1/deals',                        // clients
  '/api/v1/wiki-pages',                   // wiki
  '/api/v1/norm-documents',               // wiki
  '/api/v1/training-materials',           // training
  '/api/v1/knowledge-tests',              // training
  '/api/v1/automation-rules',             // automation
  '/api/v1/execution-logs',               // automation
  '/api/v1/system-settings',              // settings
  '/api/v1/user-preferences',             // settings
  '/api/v1/dashboard-widgets',            // dashboard
];

const maybe = BASE_URL ? describe : describe.skip;

maybe('Smoke: все ручки живы через gateway', () => {
  let token = '';

  beforeAll(async () => {
    const agent = request(BASE_URL);
    let res = await agent
      .post('/api/v1/auth/login')
      .send({ email: EMAIL, password: PASSWORD });

    // Мультиаккаунт: первый ответ без токена + список аккаунтов → перелогин.
    if (res.status === 200 && !res.body?.accessToken && Array.isArray(res.body?.accounts) && res.body.accounts.length) {
      const accountId = res.body.accounts[0].accountId ?? res.body.accounts[0].id;
      res = await agent
        .post('/api/v1/auth/login')
        .send({ email: EMAIL, password: PASSWORD, accountId });
    }

    token = res.body?.accessToken || '';
    if (!token) {
      throw new Error(
        `Не удалось авторизоваться (${res.status}). Проверь SMOKE_EMAIL/SMOKE_PASSWORD ` +
        `и что у юзера один аккаунт без 2FA. Ответ: ${JSON.stringify(res.body)?.slice(0, 200)}`,
      );
    }
  }, 30000);

  it.each(ENDPOINTS)('GET %s → не 5xx', async (path) => {
    const res = await request(BASE_URL)
      .get(path)
      .set('Authorization', `Bearer ${token}`);
    // Любой ответ < 500 = ручка/сервис живы (200 ок, 401/403/400 — тоже «доехало»).
    // 5xx = сервис упал/недоступен/крашится — вот это ловим.
    expect(res.status).toBeLessThan(500);
  }, 15000);
});
