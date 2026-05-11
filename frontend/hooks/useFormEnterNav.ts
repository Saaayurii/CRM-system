'use client';

import { useEffect } from 'react';

/**
 * Global Enter key navigation for all forms.
 * - Enter on any text/number/date/email/password/select input → focus next field with smooth scroll
 * - Enter on the last field → click the form's submit button
 * - Skips textareas (Enter = newline) and disabled/hidden inputs
 */
export function useFormEnterNav() {
  useEffect(() => {
    const FOCUSABLE =
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([disabled]),' +
      'select:not([disabled])';

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;

      const target = e.target as HTMLElement;
      const tag = target.tagName;

      // Skip textareas, buttons, links
      if (tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return;
      // Skip inputs that are not navigatable
      if (tag === 'INPUT') {
        const type = (target as HTMLInputElement).type;
        if (type === 'submit' || type === 'button' || type === 'checkbox' || type === 'radio') return;
      }

      // Find the parent form
      const form = target.closest('form');
      if (!form) return;

      const focusables = Array.from(form.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.closest('[disabled]') && el.offsetParent !== null // visible
      );

      const idx = focusables.indexOf(target);
      if (idx === -1) return;

      const isLast = idx === focusables.length - 1;

      if (isLast) {
        // Submit by clicking the first non-disabled submit button in the form
        const submitBtn = form.querySelector<HTMLButtonElement>(
          'button[type="submit"]:not([disabled]), button:not([type]):not([disabled])'
        );
        if (submitBtn) {
          e.preventDefault();
          submitBtn.click();
        }
        return;
      }

      e.preventDefault();
      const next = focusables[idx + 1];
      next.focus();
      next.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}
