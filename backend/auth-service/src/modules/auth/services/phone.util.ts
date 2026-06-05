/**
 * Normalize a free-form phone string to its last 10 digits (the Russian
 * national number), so `+7 999 123-45-67`, `8 (999) 123 45 67` and
 * `79991234567` all collapse to `9991234567`. Returns null if there
 * aren't enough digits to be a phone number.
 */
export function normalizePhoneDigits(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.slice(-10);
}
