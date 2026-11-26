import { useEffect, useRef, useState } from 'react';
import { dbCommitBatch, dbGet } from './db';

export function useStore<T>(key: string, init: T, loadPrevious?: () => T) {
  const [v, setV] = useState<T>(init);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<'read' | 'write' | 'saving' | null>(null);
  const [retry, setRetry] = useState(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const stored = useRef<T>();
  const displayed = useRef<T>();

  useEffect(() => {
    let active = true;
    dbGet<T>(key)
      .then((x) => {
        if (!active) return;
        const value = x === undefined ? loadPrevious?.() ?? init : x;
        stored.current = x;
        displayed.current = value;
        setV(value);
        setReady(true);
        setFailure(null);
      })
      .catch(() => { if (active) setFailure('read'); });
    return () => { active = false; };
  }, [key]);

  useEffect(() => {
    if (!ready || (pending.current === 0 && Object.is(displayed.current, v))) return;
    let active = true;
    setFailure('saving');
    pending.current++;
    const write = queue.current
      .then(async () => {
        if (Object.is(displayed.current, v)) return;
        await dbCommitBatch([{ key, before: stored.current, after: v }]);
        stored.current = v;
        displayed.current = v;
      })
      .finally(() => { pending.current--; });
    queue.current = write.catch(() => {});
    write.then(() => { if (active) setFailure(null); })
      .catch(() => { if (active) setFailure('write'); });
    return () => { active = false; };
  }, [key, v, ready, retry]);

  useEffect(() => {
    const onRetry = () => { if (failure === 'write') setRetry(n => n + 1); };
    window.addEventListener('azyrus-retry-save', onRetry);
    return () => window.removeEventListener('azyrus-retry-save', onRetry);
  }, [failure]);

  const adopt = (value: T) => {
    stored.current = value;
    displayed.current = value;
    setV(value);
  };
  return [v, setV, ready, failure, { stored, adopt, isSaved: pending.current === 0 && Object.is(displayed.current, v) }] as const;
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
