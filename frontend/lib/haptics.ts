/**
 * Cross-platform haptic feedback.
 *
 * - Android / Chrome: uses the standard Vibration API (navigator.vibrate).
 * - iOS Safari / PWA: the Vibration API is NOT supported, so we fall back to
 *   the "switch checkbox" trick — toggling a hidden <label> bound to an
 *   <input type="checkbox" switch> fires the Taptic engine on iOS 16.4+.
 */

let iosLabel: HTMLLabelElement | null = null;

function ensureIosHaptic(): HTMLLabelElement | null {
  if (typeof document === 'undefined') return null;
  if (iosLabel) return iosLabel;

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', ''); // iOS-only attribute that enables haptics
  input.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:0;height:0';

  const label = document.createElement('label');
  label.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:0;height:0';
  label.appendChild(input);
  document.body.appendChild(label);

  iosLabel = label;
  return label;
}

/** Trigger a short haptic pulse. `ms` is used only where the Vibration API exists. */
export function haptic(ms = 20): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      // Returns true when the vibration was scheduled (Android etc.)
      if (navigator.vibrate(ms)) return;
    }
  } catch {
    /* ignore */
  }

  // iOS fallback
  try {
    ensureIosHaptic()?.click();
  } catch {
    /* ignore */
  }
}
