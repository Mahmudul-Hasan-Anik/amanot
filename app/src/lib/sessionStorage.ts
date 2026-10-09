import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Supabase JWTs may exceed SecureStore's per-value limit. Keep encrypted chunks
// under 2000 UTF-8 bytes, including Unicode metadata. Commit the manifest last.
const CHUNK_SIZE = 500;
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const safeKey = (key: string) => `amanot.${key.replace(/[^\w.-]/g, '_')}`;
const manifestKey = (key: string) => `${safeKey(key)}.manifest`;
async function manifest(key: string): Promise<{ id: string; count: number } | null> {
  const raw = await SecureStore.getItemAsync(manifestKey(key), options);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!/^[\w-]+$/.test(parsed.id) || !Number.isInteger(parsed.count) || parsed.count < 1 || parsed.count > 100) throw Error('Invalid secure session');
  return parsed;
}
async function removeChunks(key: string, value: { id: string; count: number } | null) {
  if (value) await Promise.all(Array.from({ length: value.count }, (_, i) => SecureStore.deleteItemAsync(`${safeKey(key)}.${value.id}.${i}`, options)));
}
// Supabase serializes its auth operations; the adapter also serializes writes
// so logout cannot race an outstanding token refresh.
let writes: Promise<unknown> = Promise.resolve();
function serial<T>(operation: () => Promise<T>): Promise<T> {
  const next = writes.then(operation, operation);
  writes = next.catch(() => {});
  return next;
}
export const sessionStorage = Platform.OS === 'web' ? AsyncStorage : {
  async getItem(key: string): Promise<string | null> {
    await writes;
    const value = await manifest(key);
    if (!value) { await AsyncStorage.removeItem(key); return null; }
    const chunks = await Promise.all(Array.from({ length: value.count }, (_, i) => SecureStore.getItemAsync(`${safeKey(key)}.${value.id}.${i}`, options)));
    if (chunks.some(chunk => chunk === null)) return null;
    return chunks.join('');
  },
  setItem(key: string, value: string): Promise<void> {
    return serial(async () => {
      const previous = await manifest(key);
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const characters = Array.from(value);
      const count = Math.ceil(characters.length / CHUNK_SIZE);
      if (count < 1 || count > 100) throw Error('Session storage size exceeded');
      try {
        for (let i = 0; i < count; i++) await SecureStore.setItemAsync(`${safeKey(key)}.${id}.${i}`, characters.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE).join(''), options);
        await SecureStore.setItemAsync(manifestKey(key), JSON.stringify({ id, count }), options);
      } catch (error) { await removeChunks(key, { id, count }); throw error; }
      await removeChunks(key, previous);
      await AsyncStorage.removeItem(key); // remove the previous plaintext session
    });
  },
  removeItem(key: string): Promise<void> {
    return serial(async () => {
      const previous = await manifest(key);
      await SecureStore.deleteItemAsync(manifestKey(key), options);
      await removeChunks(key, previous);
      await AsyncStorage.removeItem(key);
    });
  },
};
