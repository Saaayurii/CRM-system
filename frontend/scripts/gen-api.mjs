#!/usr/bin/env node
/**
 * Генерация типизированного API-контракта из OpenAPI бэкенда.
 *
 * Источник правды — Swagger каждого из 23 NestJS-сервисов (богатые DTO), а НЕ
 * api-gateway (там тела прокси-запросов `any`). Скрипт:
 *   1. забирает `/api/docs-json` у каждого сервиса;
 *   2. префиксует пути под gateway: сервис отдаёт `/users`, а фронт ходит на
 *      `/api/v1/users` (Next rewrite → gateway → сервис). Правило: prepend `/api/v1`;
 *   3. разводит `components.schemas` по неймспейсам (напр. `Users_UserResponseDto`),
 *      чтобы одноимённые DTO из разных сервисов не перезаписали друг друга;
 *   4. сливает всё в один openapi.json;
 *   5. гонит `openapi-typescript` → `lib/api/schema.d.ts`.
 *
 * ВАЖНО: нужен поднятый бэкенд (`cd backend && docker compose up -d`) — иначе
 * сервисы недоступны. Недоступные сервисы пропускаются с предупреждением
 * (частичная генерация, чтобы можно было работать с тем, что поднято).
 *
 * Переопределить хост/порты: API_GEN_HOST=host, либо целиком через
 * <SERVICE>_DOCS_URL (напр. USERS_DOCS_URL=http://users:3002/api/docs-json).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'lib', 'api');
const OPENAPI_JSON = join(OUT_DIR, 'openapi.json');
const SCHEMA_DTS = join(OUT_DIR, 'schema.d.ts');

const HOST = process.env.API_GEN_HOST || 'localhost';

// name → { port, prefix }. prefix=true → пути сервиса префиксуются '/api/v1'.
// Порты из CLAUDE.md (карта сервисов). Gateway (3000) уже отдаёт пути с /api/v1.
const SERVICES = [
  { name: 'gateway', port: 3000, prefix: false },
  { name: 'auth', port: 3001, prefix: true },
  { name: 'users', port: 3002, prefix: true },
  { name: 'projects', port: 3003, prefix: true },
  { name: 'tasks', port: 3004, prefix: true },
  { name: 'materials', port: 3005, prefix: true },
  { name: 'suppliers', port: 3006, prefix: true },
  { name: 'finance', port: 3007, prefix: true },
  { name: 'inspections', port: 3008, prefix: true },
  { name: 'hr', port: 3009, prefix: true },
  { name: 'notifications', port: 3010, prefix: true },
  { name: 'chat', port: 3011, prefix: true },
  { name: 'calendar', port: 3012, prefix: true },
  { name: 'equipment', port: 3013, prefix: true },
  { name: 'documents', port: 3014, prefix: true },
  { name: 'reports', port: 3015, prefix: true },
  { name: 'dictionary', port: 3016, prefix: true },
  { name: 'audit', port: 3017, prefix: true },
  { name: 'clients', port: 3018, prefix: true },
  { name: 'wiki', port: 3019, prefix: true },
  { name: 'training', port: 3020, prefix: true },
  { name: 'automation', port: 3021, prefix: true },
  { name: 'settings', port: 3022, prefix: true },
  { name: 'dashboard', port: 3023, prefix: true },
];

const pascal = (s) => s.replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase());

function docsUrl(svc) {
  const override = process.env[`${svc.name.toUpperCase()}_DOCS_URL`];
  return override || `http://${HOST}:${svc.port}/api/docs-json`;
}

async function fetchDoc(svc) {
  const url = docsUrl(svc);
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Префиксует пути под gateway и разводит схемы по неймспейсу сервиса. */
function normalize(svc, doc) {
  const ns = pascal(svc.name);
  // 1. Переименовать все ссылки на схемы: #/components/schemas/X → .../NS_X.
  //    Разом по строке — refs и ключи схем получают один и тот же префикс.
  const rewritten = JSON.parse(
    JSON.stringify(doc).replaceAll(
      '#/components/schemas/',
      `#/components/schemas/${ns}_`,
    ),
  );

  const schemas = {};
  for (const [k, v] of Object.entries(rewritten.components?.schemas || {})) {
    schemas[`${ns}_${k}`] = v;
  }

  const paths = {};
  for (const [p, v] of Object.entries(rewritten.paths || {})) {
    const np = svc.prefix ? `/api/v1${p.startsWith('/') ? '' : '/'}${p}` : p;
    paths[np] = v;
  }
  return { paths, schemas };
}

async function main() {
  const merged = {
    openapi: '3.0.0',
    info: { title: 'Construction CRM — merged API', version: '1.0.0' },
    paths: {},
    components: { schemas: {} },
  };

  let ok = 0;
  const failed = [];
  for (const svc of SERVICES) {
    try {
      const doc = await fetchDoc(svc);
      const { paths, schemas } = normalize(svc, doc);
      Object.assign(merged.paths, paths);
      Object.assign(merged.components.schemas, schemas);
      ok += 1;
      console.log(`  ✓ ${svc.name.padEnd(14)} ${Object.keys(paths).length} paths`);
    } catch (err) {
      failed.push(svc.name);
      console.warn(`  ✗ ${svc.name.padEnd(14)} ${err.message} (пропущен)`);
    }
  }

  if (ok === 0) {
    console.error(
      '\nНи один сервис не ответил. Подними бэкенд: `cd backend && docker compose up -d`',
    );
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OPENAPI_JSON, JSON.stringify(merged, null, 2));
  console.log(`\nСлито: ${ok} сервисов, ${Object.keys(merged.paths).length} путей → ${OPENAPI_JSON}`);
  if (failed.length) console.log(`Пропущено (не подняты?): ${failed.join(', ')}`);

  // openapi-typescript → schema.d.ts
  const bin = join(__dirname, '..', 'node_modules', '.bin', 'openapi-typescript');
  execFileSync(bin, [OPENAPI_JSON, '-o', SCHEMA_DTS], { stdio: 'inherit' });
  console.log(`Готово: ${SCHEMA_DTS}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
