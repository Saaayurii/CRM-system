#!/usr/bin/env node
/**
 * Подключает @ApiResponse(type: <Dto>) к CRUD-методам контроллера по эвристике
 * из summary в @ApiOperation:
 *   "Get all"/"records"/"list" → массив, 200
 *   "by ID"                    → один, 200
 *   "Create"                   → один, 201
 *   "Update"                   → один, 200
 *   "Delete"                   → пропуск (204, без тела)
 * Плюс добавляет ApiResponse в импорт @nestjs/swagger и импорт DTO.
 *
 *   node scripts/wire-api-response.mjs <controller.ts> <dtoImportPath> <ClassName>
 *
 * Для контроллеров с ОДНИМ ресурсом. Файлы с несколькими @Controller (напр.
 * payments: PaymentAccount+Payment) — вручную, иначе повесит не тот DTO.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [file, importPath, className] = process.argv.slice(2);
if (!file || !importPath || !className) {
  console.error('usage: wire-api-response.mjs <controller.ts> <dtoImportPath> <ClassName>');
  process.exit(1);
}
let src = readFileSync(file, 'utf8');

// 1) ApiResponse в импорт swagger
if (!/\bApiResponse\b/.test(src)) {
  src = src.replace(/\n\}\s*from\s*'@nestjs\/swagger';/, "\n  ApiResponse,\n} from '@nestjs/swagger';");
}
// 2) импорт DTO — после блока импорта swagger
if (!src.includes(className)) {
  src = src.replace(
    /(\}\s*from\s*'@nestjs\/swagger';\n)/,
    `$1import { ${className} } from '${importPath}';\n`,
  );
}

// 3) @ApiResponse после каждого @ApiOperation
const specFor = (summary) => {
  const s = summary.toLowerCase();
  if (/delete|remove/.test(s)) return null;
  if (/get all|records|list|\ball\b/.test(s)) return `{ status: 200, type: ${className}, isArray: true }`;
  if (/by id|get .* by|:id/.test(s)) return `{ status: 200, type: ${className} }`;
  if (/create/.test(s)) return `{ status: 201, type: ${className} }`;
  if (/update|edit|patch/.test(s)) return `{ status: 200, type: ${className} }`;
  return null;
};

let wired = 0;
src = src.replace(
  /^([ \t]*)@ApiOperation\(\{\s*summary:\s*'([^']*)'[^}]*\}\)\s*$/gm,
  (line, indent, summary) => {
    const spec = specFor(summary);
    if (!spec) return line;
    wired += 1;
    return `${line}\n${indent}@ApiResponse(${spec})`;
  },
);

writeFileSync(file, src);
console.log(`  ${file}: +${wired} @ApiResponse (${className})`);
