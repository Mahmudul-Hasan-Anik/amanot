import * as Crypto from 'expo-crypto';
import { toEnglishDigits } from './bengali';

export const PIN_LENGTH = 6;
export const normalizePin = (value: string) => toEnglishDigits(value).trim();
export function isStrongPin(value: string): boolean {
  const pin = normalizePin(value);
  return /^\d{6}$/.test(pin) && !/^(\d)\1{5}$/.test(pin)
    && !['012345', '123456', '234567', '345678', '456789', '987654', '876543', '765432', '654321', '543210'].includes(pin);
}
export function generateTemporaryPin(): string {
  // Rejection sampling avoids modulo bias. Never persist or log this value.
  for (;;) {
    const bytes = Crypto.getRandomBytes(4);
    const number = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
    if (number >= 4294000000) continue;
    const pin = String(number % 1000000).padStart(PIN_LENGTH, '0');
    if (isStrongPin(pin)) return pin;
  }
}
