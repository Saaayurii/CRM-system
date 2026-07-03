// Ambient-декларация для side-effect импортов стилей (`import './globals.css'`).
// Next.js обрабатывает такие импорты сам, но standalone type-checker (tsgo/tsc без
// next-плагина) без этого ругается TS2882. Безопасно для обычного `next build`.
declare module '*.css';
declare module '*.scss';
