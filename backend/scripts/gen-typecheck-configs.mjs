#!/usr/bin/env node
/**
 * Генерирует `tsconfig.typecheck.json` для каждого сервиса воркспейса.
 *
 * Зачем отдельный конфиг: tsgo (TS7 native preview) удалил опцию `baseUrl`,
 * которая есть в рабочих tsconfig.json сервисов. Трогать их нельзя — `nest build`
 * идёт через tsc 5, где baseUrl валиден. Поэтому для быстрого тайпчека делаем
 * standalone-конфиг: копия compilerOptions сервиса МИНУС baseUrl (он всё равно
 * no-op — `paths` никто не использует), с noEmit и без тестов/сгенерированного кода.
 *
 * Файлы в .gitignore и перегенерируются автоматически перед `npm run typecheck`.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function serviceDirs() {
  return readdirSync(ROOT).filter((name) => {
    const p = join(ROOT, name);
    return (
      (name === 'api-gateway' || name.endsWith('-service')) &&
      statSync(p).isDirectory() &&
      existsSync(join(p, 'tsconfig.json'))
    );
  });
}

export function genConfigs() {
  const dirs = serviceDirs();
  for (const name of dirs) {
    const svc = join(ROOT, name);
    const tc = JSON.parse(readFileSync(join(svc, 'tsconfig.json'), 'utf8'));
    const compilerOptions = { ...(tc.compilerOptions || {}) };
    delete compilerOptions.baseUrl; // TS7 удалил опцию
    compilerOptions.noEmit = true;
    // tsgo (preview) при strictNullChecks включает strictPropertyInitialization,
    // а tsc5 (реальный `nest build`) — нет. Держим тайпчек верным сборке: не строже.
    compilerOptions.strictPropertyInitialization = false;
    const out = {
      // NB: standalone, НЕ extends — extends наследовал бы baseUrl и tsgo падает.
      compilerOptions,
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules',
        'dist',
        '**/generated/**',
        '**/*.spec.ts',
        '**/*.e2e-spec.ts',
        'test',
      ],
    };
    writeFileSync(join(svc, 'tsconfig.typecheck.json'), JSON.stringify(out, null, 2) + '\n');
  }
  return dirs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dirs = genConfigs();
  console.log(`Сгенерировано tsconfig.typecheck.json: ${dirs.length} сервисов`);
}
