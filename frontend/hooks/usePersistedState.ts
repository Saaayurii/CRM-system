import { useEffect, useState } from 'react';

// Состояние, сохраняемое в localStorage, но безопасное для гидратации.
//
// Проблема (React #418): если читать localStorage прямо в инициализаторе
// useState, сервер (где window нет) отрендерит значение по умолчанию, а клиент
// на ПЕРВОМ рендере — сохранённое значение. HTML не совпадает → предупреждение
// гидратации, лишний ре-рендер и мерцание активной вкладки/режима.
//
// Решение: и на сервере, и на первом клиентском рендере возвращаем `defaultValue`
// (детерминированно, разметка совпадает), а сохранённое значение подхватываем
// уже ПОСЛЕ монтирования в useEffect. Сеттер сам пишет в localStorage.
export function usePersistedState<T extends string>(
  key: string,
  defaultValue: T,
  allowed?: readonly T[],
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored && (!allowed || allowed.includes(stored as T))) {
        setValue(stored as T);
      }
    } catch {
      /* localStorage недоступен — остаёмся на значении по умолчанию */
    }
    // key стабилен в пределах компонента; allowed намеренно не в deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = (next: T) => {
    setValue(next);
    try {
      localStorage.setItem(key, next);
    } catch {
      /* игнорируем — состояние в памяти всё равно обновится */
    }
  };

  return [value, set];
}
