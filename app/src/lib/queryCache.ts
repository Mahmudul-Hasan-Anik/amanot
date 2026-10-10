/** Bounded, memory-only query cache. Revision/account identity belongs in each key. */
type Entry = { value?: unknown; ready: boolean; pending?: Promise<any> };
const entries = new Map<string, Entry>();
let generation = 0;
const limit = 64;
function put(key: string, entry: Entry) {
  entries.delete(key); entries.set(key, entry);
  while (entries.size > limit) entries.delete(entries.keys().next().value!);
}
export function queryCacheGeneration() { return generation; }
export function clearQueryCache() { generation++; entries.clear(); }
export function readQueryCache<T>(key: string): { data: T } | undefined {
  const entry = entries.get(key);
  if (!entry?.ready) return;
  put(key, entry);
  return { data: entry.value as T };
}
export function writeQueryCache<T>(key: string, data: T) { put(key, {value:data,ready:true}); }
export function cachedQuery<T>(key: string, load: () => Promise<T>, force = false): Promise<T> {
  const existing = entries.get(key);
  // Even explicit retries join a request already running for this key.
  if (existing?.pending) return existing.pending;
  if (!force && existing?.ready) { put(key,existing); return Promise.resolve(existing.value as T); }
  const epoch = generation;
  const entry: Entry = {ready:false};
  put(key,entry);
  let request: Promise<T>;
  try { request=load(); } catch(error) { entries.delete(key); return Promise.reject(error); }
  entry.pending = request.then(data => {
    if (epoch !== generation) throw new Error('Query invalidated');
    if (entries.get(key) === entry) put(key,{value:data,ready:true});
    return data;
  }, error => { if(entries.get(key) === entry) entries.delete(key); throw error; });
  return entry.pending;
}
