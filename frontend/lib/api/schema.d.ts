/**
 * ЗАГЛУШКА. Реальный файл генерируется командой `npm run gen:api` из OpenAPI
 * поднятого бэкенда (см. scripts/gen-api.mjs). Здесь пустой контракт, чтобы
 * lib/api/typed.ts компилировался до первой генерации. НЕ редактировать руками —
 * будет перезаписан генератором.
 */
export interface paths {}
export interface components {
  schemas: Record<string, never>;
}
export interface operations {}
export type webhooks = Record<string, never>;
export type $defs = Record<string, never>;
