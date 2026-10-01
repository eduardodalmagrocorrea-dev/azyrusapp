import { useEffect, useState } from 'react';
import { dbGet, dbSet } from './db';

export function useStore<T>(key: string, init: T) {
  const [v, setV] = useState<T>(init);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    dbGet<T>(key)
      .then((x) => { if (x !== undefined) setV(x); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [key]);

  useEffect(() => {
    if (ready) dbSet(key, v).catch(() => {});
  }, [key, v, ready]);

  return [v, setV, ready] as const;
}

export function useLocal<T extends object>(key: string, init: T) {
  const [v, setV] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? { ...init, ...JSON.parse(s) } : init;
    } catch {
      return init;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key, v]);

  return [v, setV] as const;
}