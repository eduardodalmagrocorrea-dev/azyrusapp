let p: Promise<IDBDatabase> | undefined;

const open = () => (p ??= new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open('azyrus', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('kv');
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
}));

export async function dbGet<T>(k: string) {
  const d = await open();
  return new Promise<T | undefined>((res, rej) => {
    const q = d.transaction('kv').objectStore('kv').get(k);
    q.onsuccess = () => res(q.result as T | undefined);
    q.onerror = () => rej(q.error);
  });
}

export async function dbSet(k: string, v: unknown) {
  const d = await open();
  return new Promise<void>((res, rej) => {
    const t = d.transaction('kv', 'readwrite');
    t.objectStore('kv').put(v, k);
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
}