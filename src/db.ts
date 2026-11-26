let p: Promise<IDBDatabase> | undefined;

const open = () => (p ??= new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open('azyrus', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('kv');
  r.onsuccess = () => { r.result.onversionchange = () => { r.result.close(); p = undefined; }; res(r.result); };
  r.onerror = () => rej(r.error);
})).catch(error => { p = undefined; throw error; });

export async function dbGet<T>(k: string) {
  const d = await open();
  return new Promise<T | undefined>((res, rej) => {
    const q = d.transaction('kv').objectStore('kv').get(k);
    q.onsuccess = () => res(q.result as T | undefined);
    q.onerror = () => rej(q.error);
  });
}

export async function dbCommitBatch(changes: { key: string; before: unknown; after: unknown }[]) {
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('kv', 'readwrite');
    const store = transaction.objectStore('kv');
    let failure: Error | undefined;
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(failure ?? transaction.error ?? new Error('Não foi possível salvar o lote.'));
    for (const { key, before, after } of changes) {
      const request = store.get(key);
      request.onsuccess = () => {
        try {
          if (JSON.stringify(request.result) !== JSON.stringify(before)) {
            throw new Error('Os dados mudaram em outra janela. Reabra o aplicativo e revise o comando.');
          }
          store.put(after, key);
        } catch (error) {
          failure = error instanceof Error ? error : undefined;
          transaction.abort();
        }
      };
    }
  });
}
