#!/usr/bin/env node
/**
 * Генератор response-DTO из Prisma-модели.
 *
 *   node scripts/gen-response-dto.mjs <schema.prisma> <ModelName> <out.ts> [ClassName]
 *
 * Парсит `model <ModelName> { ... }`, берёт СКАЛЯРНЫЕ поля (Int/String/Boolean/
 * DateTime/Decimal/Float/BigInt/Json/Bytes), пропускает relation-поля (ссылки на
 * другие модели и их массивы). `?` → optional + nullable. Пишет класс с
 * @ApiProperty/@ApiPropertyOptional — форма ответа для @ApiResponse контроллера,
 * попадает в OpenAPI → фронт получает типы через `npm run gen:api`.
 *
 * Держать в синхроне с schema.prisma: перегенерировать при изменении модели.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SCALARS = new Set([
  'Int', 'String', 'Boolean', 'DateTime', 'Decimal', 'Float', 'BigInt', 'Json', 'Bytes',
]);

function tsType(prismaType) {
  switch (prismaType) {
    case 'Int': case 'Float': case 'Decimal': case 'BigInt': return 'number';
    case 'String': return 'string';
    case 'Boolean': return 'boolean';
    case 'DateTime': return 'string'; // ISO при JSON-сериализации
    case 'Json': return 'Record<string, unknown> | unknown[]';
    case 'Bytes': return 'string';
    default: return 'unknown';
  }
}

function apiPropExtras(prismaType) {
  if (prismaType === 'DateTime') return `, type: String, format: 'date-time'`;
  if (prismaType === 'Json') return `, type: Object`;
  return '';
}

function parseModel(schema, model) {
  const re = new RegExp(`model\\s+${model}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const m = schema.match(re);
  if (!m) throw new Error(`model ${model} не найден`);
  const fields = [];
  for (const raw of m[1].split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith('@@')) continue;
    const tok = line.match(/^(\w+)\s+(\w+)(\[\])?(\?)?/);
    if (!tok) continue;
    const [, name, type, arr, opt] = tok;
    if (!SCALARS.has(type)) continue; // relation / enum → пропускаем
    if (arr) continue; // скалярных массивов в этих схемах нет; массив = relation
    fields.push({ name, type, optional: Boolean(opt) });
  }
  return fields;
}

function emit(className, fields) {
  const lines = [
    `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';`,
    ``,
    `/** Автогенерировано из Prisma-модели (scripts/gen-response-dto.mjs). Форма ответа для @ApiResponse → OpenAPI → фронтовые типы. */`,
    `export class ${className} {`,
  ];
  for (const f of fields) {
    const t = tsType(f.type);
    if (f.optional) {
      lines.push(`  @ApiPropertyOptional({ nullable: true${apiPropExtras(f.type)} }) ${f.name}?: ${t} | null;`);
    } else {
      lines.push(`  @ApiProperty({${apiPropExtras(f.type).replace(/^, /, ' ') || ''} }) ${f.name}: ${t};`.replace('{ }', '{}').replace('{  ', '{ '));
    }
  }
  lines.push(`}`, ``);
  return lines.join('\n');
}

const [schemaPath, model, outPath, classNameArg] = process.argv.slice(2);
if (!schemaPath || !model || !outPath) {
  console.error('usage: gen-response-dto.mjs <schema.prisma> <Model> <out.ts> [ClassName]');
  process.exit(1);
}
const className = classNameArg || `${model}ResponseDto`;
const schema = readFileSync(schemaPath, 'utf8');
const fields = parseModel(schema, model);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, emit(className, fields));
console.log(`${className}: ${fields.length} полей → ${outPath}`);
