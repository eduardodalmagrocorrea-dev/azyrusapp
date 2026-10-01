import type { Goal, Habit } from './types';

export const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const MILESTONES = [7, 30, 90, 180, 365];

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const today = () => iso(new Date());

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const parse = (s: string) => new Date(s + 'T12:00:00');
export const due = (h: Habit, d: Date) => h.days.includes(d.getDay());

export const freq = (h: Habit) =>
  h.days.length === 7 ? 'Todos os dias' :
  h.days.length === 0 ? 'Sem dias' :
  h.days.map((d) => DOW[d]).join(', ');

export const num = (s: string) => {
  const n = Number(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export const fmtNum = (n: number) =>
  n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export const money = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtDate = (s: string) => {
  if (!s) return '';
  const t = new Date();
  if (s === iso(t)) return 'Hoje';
  if (s === iso(addDays(t, 1))) return 'Amanhã';
  const [y, m, d] = s.split('-');
  return `${d}/${m}${y !== String(t.getFullYear()) ? '/' + y : ''}`;
};

export const goalPct = (g: Goal) => {
  if (g.status === 'concluída') return 100;
  if (!g.tracked) return Math.max(0, Math.min(100, g.pct));
  if (g.target === g.start) return g.current >= g.target ? 100 : 0;
  return Math.max(0, Math.min(100, ((g.current - g.start) / (g.target - g.start)) * 100));
};

const run = (s: Set<string>, h: Habit, end: Date) => {
  let n = 0;
  for (let i = 0; i < 3700; i++) {
    const d = addDays(end, -i);
    if (!due(h, d)) continue;
    if (s.has(iso(d))) n++;
    else break;
  }
  return n;
};

export function streaks(h: Habit) {
  const s = new Set(h.done);
  const t = new Date();
  const end = due(h, t) && !s.has(iso(t)) ? addDays(t, -1) : t;
  const cur = run(s, h, end);
  let best = cur;
  for (const d of h.done) best = Math.max(best, run(s, h, parse(d)));
  return { cur, best, total: h.done.length };
}