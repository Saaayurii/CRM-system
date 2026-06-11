import { useLanguageStore } from '@/stores/languageStore';
import { en } from './en';

export function useT(): (key: string) => string {
  const language = useLanguageStore((s) => s.language);
  return (key: string) => {
    if (language === 'ru') return key;
    return en[key] ?? key;
  };
}
