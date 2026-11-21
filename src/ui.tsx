import { useEffect, useRef } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { Check, X } from 'lucide-react';

export const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const c = cx('surface', className);
  return onClick
    ? <button onClick={onClick} className={cx(c, 'w-full text-left active:scale-[.99] transition-transform')}>{children}</button>
    : <div className={c}>{children}</div>;
}

export function Btn({ variant = 'primary', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const v = {
    primary: 'bg-ac text-on',
    ghost: 'control-ghost',
    danger: 'control-ghost text-danger'
  }[variant];
  return <button {...p} className={cx('control px-3 active:opacity-80 inline-flex items-center justify-center gap-2', v, className)} />;
}

const inp = 'field mt-1';

export function Field({ label, className, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="block mb-3"><span className="text-sm text-mu">{label}</span><input {...p} className={cx(inp, className)} /></label>;
}

export function Sel({ label, children, className, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return <label className="block mb-3"><span className="text-sm text-mu">{label}</span><select {...p} className={cx(inp, className)}>{children}</select></label>;
}

export function Head({ title, action }: { title: string; action?: ReactNode }) {
  return <div className="flex items-center justify-between gap-3 mb-6"><h1 className="page-title">{title}</h1>{action}</div>;
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const overlay = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const viewport = window.visualViewport;
    const element = overlay.current;
    const syncViewport = () => {
      if (!element || !viewport || viewport.scale !== 1) return;
      element.style.top = `${viewport.offsetTop}px`;
      element.style.height = `${viewport.height}px`;
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current();
    };
    syncViewport();
    viewport?.addEventListener('resize', syncViewport);
    viewport?.addEventListener('scroll', syncViewport);
    window.addEventListener('keydown', handleKey);
    return () => {
      viewport?.removeEventListener('resize', syncViewport);
      viewport?.removeEventListener('scroll', syncViewport);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  return (
    <div ref={overlay} className="fixed inset-x-0 top-0 h-dvh z-40 bg-black/60 flex items-end sm:items-center px-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]" onClick={onClose}>
      <div role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="sheet w-full max-w-lg mx-auto bg-sf rounded-t-[1.25rem] max-h-[calc(100%-env(safe-area-inset-top))] overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="size-11 -mr-2 grid place-items-center text-mu"><X size={22} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Bar({ pct }: { pct: number }) {
  return <div className="h-1.5 rounded-full bg-ln overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
    <div className="h-full rounded-full bg-ac transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
  </div>;
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return <div className="empty-state"><p className={action ? 'mb-4' : undefined}>{text}</p>{action}</div>;
}

export function CheckBtn({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} aria-label={label} aria-pressed={on} className="size-11 shrink-0 grid place-items-center">
      <span className={cx('size-7 rounded-full border-2 grid place-items-center transition-colors', on ? 'bg-ac border-ac text-on' : 'border-mu')}>
        {on && <Check size={16} strokeWidth={3} />}
      </span>
    </button>
  );
}