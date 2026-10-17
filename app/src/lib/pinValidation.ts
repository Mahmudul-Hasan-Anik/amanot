import { isStrongPin, normalizePin } from './pinPolicy';

export type PinChangeError = 'current' | 'length' | 'weak' | 'confirmation' | 'same';
export function validatePinChange(current: string, next: string, confirmation: string): PinChangeError | null {
  const oldPin = normalizePin(current), newPin = normalizePin(next);
  if (!/^\d{6}$/.test(oldPin)) return 'current';
  if (!/^\d{6}$/.test(newPin)) return 'length';
  if (!isStrongPin(newPin)) return 'weak';
  if (newPin !== normalizePin(confirmation)) return 'confirmation';
  if (newPin === oldPin) return 'same';
  return null;
}
