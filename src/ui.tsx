import { useEffect } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { Check, X } from 'lucide-react';

export const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const c = cx('rounded-2xl bg-sf border border-ln p-4', className);
  return onClick
    ? <button onClick={onClick} className={cx(c, 'w-full text-left active:scale-[.99] transition-transform')}>{children}</button>
    : <div className={c}>{children}</div>;
}

export function Btn({ variant = 'primary', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const v = {
    primary: 'bg-ac text-on',
    ghost: 'border border-ln',
    danger: 'border border-ln text-[#D64545]'
  }[variant];
  return <button {...p} className={cx('h-12 rounded-xl px-4 font-medium active:opacity-80 inline-flex items-center justify-center gap-2', v, className)} />;
}

const inp = 'mt-1 w-full h-12 rounded-xl bg-bg border border-ln px-3 text-tx focus:outline-2 focus:outline-ac';

export function Field({ label, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="block mb-3"><span className="text-sm text-mu">{label}</span><input {...p} className={inp} /></label>;
}

export function Sel({ label, children, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return <label className="block mb-3"><span className="text-sm text-mu">{label}</span><select {...p} className={inp}>{children}</select></label>;
}

export function Head({ title, action }: { title: string; action?: ReactNode }) {
  return <div className="flex items-center justify-between mb-5"><h1 className="text-3xl font-light tracking-tight">{title}</h1>{action}</div>;
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-end" onClick={onClose}>
      <div role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="sheet w-full max-w-md mx-auto bg-sf rounded-t-3xl max-h-[90dvh] overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium">{title}</h2>
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
  return <div className="text-center text-mu py-14"><p className="mb-4">{text}</p>{action}</div>;
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