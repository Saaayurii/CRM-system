#!/usr/bin/env node
/**
 * Smoke-тест всех ручек через живой api-gateway (чёрный ящик, без зависимостей).
 *
 * Проверяет, что каждый микросервис поднят и доступен через gateway: логинится
 * и дёргает по одной-две представительные GET-ручки на сервис. Падение = ответ
 * 5xx (сервис лёг/крашится) или недоступность gateway. 2xx/4xx = «ручка жива».
 * Бизнес-логику НЕ проверяет — только доступность.
 *
 * Запуск:
 *   SMOKE_BASE_URL=http://localhost:3000 \
 *   SMOKE_EMAIL=admin@crm.local SMOKE_PASSWORD='Password123!' \
 *   node backend/scripts/smoke.mjs
 *
 * В деплое (внутри контейнера gateway, где есть node):
 *   docker exec -i -e SMOKE_BASE_URL=http://localhost:3000 \
 *     -e SMOKE_EMAIL=... -e SMOKE_PASSWORD=... \
 *     crm-api-gateway node < backend/scripts/smoke.mjs
 *
 * Коды выхода: 0 — все ручки < 500; 1 — есть 5xx/недоступность; 2 — не залогинились.
 * Без SMOKE_BASE_URL — печатает usage и выходит 0 (безопасно для опц. вызова).
 */

const BASE_URL = (process.env.SMOKE_BASE_URL || '').replace(/\/+$/, '');
const EMAIL = process.env.SMOKE_EMAIL || 'admin@crm.local';
const PASSWORD = process.env.SMOKE_PASSWORD || 'Password123!';
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 12000);

// Реальные маршруты gateway — по 1-2 на каждый из 24 сервисов.
const ENDPOINTS = [
  '/api/v1/health',                 // gateway
  '/api/v1/auth/me',                // auth
  '/api/v1/users',                  // users
  '/api/v1/projects',               // projects
  '/api/v1/construction-sites',     // projects
  '/api/v1/tasks',                  // tasks
  '/api/v1/tasks/stats',            // tasks
  '/api/v1/materials',              // materials
  '/api/v1/material-categories',    // materials
  '/api/v1/warehouses',             // materials
  '/api/v1/suppliers',              // suppliers
  '/api/v1/contractors',            // suppliers
  '/api/v1/supplier-orders',        // suppliers
  '/api/v1/payments',               // finance
  '/api/v1/budgets',                // finance
  '/api/v1/payment-accounts',       // finance
  '/api/v1/inspections',            // inspections
  '/api/v1/defects',                // inspections
  '/api/v1/inspection-templates',   // inspections
  '/api/v1/teams',                  // hr
  '/api/v1/attendance',             // hr
  '/api/v1/employee-documents',     // hr
  '/api/v1/notifications',          // notifications
  '/api/v1/announcements',          // notifications
  '/api/v1/chat-channels',          // chat
  '/api/v1/calendar-events',        // calendar
  '/api/v1/equipment',              // equipment
  '/api/v1/equipment-maintenance',  // equipment
  '/api/v1/documents',              // documents
  '/api/v1/document-templates',     // documents
  '/api/v1/report-templates',       // reports
  '/api/v1/generated-reports',      // reports
  '/api/v1/dictionaries',           // dictionary
  '/api/v1/dictionary-values',      // dictionary
  '/api/v1/event-logs',             // audit
  '/api/v1/clients',                // clients
  '/api/v1/deals',                  // clients
  '/api/v1/wiki-pages',             // wiki
  '/api/v1/norm-documents',         // wiki
  '/api/v1/training-materials',     // training
  '/api/v1/knowledge-tests',        // training
  '/api/v1/automation-rules',       // automation
  '/api/v1/execution-logs',         // automation
  '/api/v1/system-settings',        // settings
  '/api/v1/user-preferences',       // settings
  '/api/v1/dashboard-widgets',      // dashboard
];

function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

async function login() {
  const body = { email: EMAIL, password: PASSWORD };
  let res = await fetchWithTimeout(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data = await res.json().catch(() => ({}));

  // Мультиаккаунт: пустой токен + список аккаунтов → перелогин с accountId.
  if (res.ok && !data.accessToken && Array.isArray(data.accounts) && data.accounts.length) {
    const accountId = data.accounts[0].accountId ?? data.accounts[0].id;
    res = await fetchWithTimeout(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, accountId }),
    });
    data = await res.json().catch(() => ({}));
  }
  return data.accessToken || '';
}

async function main() {
  if (!BASE_URL) {
    console.log('SMOKE: SMOKE_BASE_URL не задан — пропускаю (usage в шапке файла).');
    process.exit(0);
  }

  let token;
  try {
    token = await login();
  } catch (e) {
    console.error(`SMOKE: логин недоступен: ${e.message}`);
    process.exit(2);
  }
  if (!token) {
    console.error('SMOKE: не удалось авторизоваться (проверь creds / 2FA / мультиаккаунт).');
    process.exit(2);
  }

  const headers = { Authorization: `Bearer ${token}` };
  const failures = [];
  for (const path of ENDPOINTS) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}${path}`, { headers });
      const mark = res.status < 500 ? 'ok ' : 'ERR';
      if (res.status >= 500) failures.push(`${path} → ${res.status}`);
      console.log(`  [${mark}] ${res.status}  ${path}`);
    } catch (e) {
      failures.push(`${path} → ${e.name === 'AbortError' ? 'timeout' : e.message}`);
      console.log(`  [ERR] ---  ${path} (${e.name})`);
    }
  }

  console.log('');
  if (failures.length) {
    console.error(`SMOKE: ПРОВАЛ — ${failures.length}/${ENDPOINTS.length} ручек недоступны:`);
    failures.forEach((f) => console.error(`   - ${f}`));
    process.exit(1);
  }
  console.log(`SMOKE: OK — все ${ENDPOINTS.length} ручек отвечают (< 500).`);
  process.exit(0);
}

main();
