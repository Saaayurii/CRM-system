#!/usr/bin/env node
/**
 * Быстрый тайпчек всех сервисов через tsgo (TS7 native preview).
 * Только для локали/CI — прод-сборку (Docker/`nest build`) НЕ трогает.
 *
 * Перегенерирует tsconfig.typecheck.json (см. gen-typecheck-configs.mjs), затем
 * гоняет `tsgo -p ... --noEmit` по каждому сервису и агрегирует результат.
 */
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genConfigs } from './gen-typecheck-configs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TSGO = join(ROOT, 'node_modules', '.bin', 'tsgo');

const dirs = genConfigs();
let failed = 0;
const started = Date.now();

for (const name of dirs) {
  try {
    execFileSync(TSGO, ['-p', join(name, 'tsconfig.typecheck.json'), '--noEmit'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    const out = `${err.stdout || ''}${err.stderr || ''}`.trim();
    console.log(`  ✗ ${name}`);
    console.log(out.split('\n').map((l) => `      ${l}`).join('\n'));
  }
}

const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\n${dirs.length - failed}/${dirs.length} сервисов прошли тайпчек за ${secs}s`);
process.exit(failed ? 1 : 0);
