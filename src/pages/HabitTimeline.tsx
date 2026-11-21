import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Habit } from '../types';
import { Bar, CheckBtn, cx } from '../ui';
import { addDays, due, iso, parse } from '../utils';

const periods = [
  { label: 'Manhã', start: 0, end: 12 * 60 },
  { label: 'Tarde', start: 12 * 60, end: 18 * 60 },
  { label: 'Noite', start: 18 * 60, end: 24 * 60 }
];

const calendarDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });

function timeInMinutes(time: string) {
  if (!/^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

type Props = {
  habits: Habit[];
  date?: string;
  onDateChange: (date: string | undefined) => void;
  onToggle: (id: string, date: string) => void;
  onOpen: (id: string) => void;
};

export default function HabitTimeline({ habits, date, onDateChange, onToggle, onOpen }: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 15_000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const today = iso(now);
  const selected = date ?? today;
  const day = parse(selected);
  const currentMinute = now.getHours() * 60 + now.getMinutes();
  const entries = habits
    .filter(habit => due(habit, day) && (!habit.created || habit.created <= selected))
    .map(habit => ({ habit, done: habit.done.includes(selected), minute: timeInMinutes(habit.time) }));
  const timed = entries
    .flatMap(entry => entry.minute === null ? [] : [{ ...entry, minute: entry.minute }])
    .sort((a, b) => a.minute - b.minute);
  const groups = [
    ...periods.map(({ label, start, end }) => ({
      label,
      timed: true,
      entries: timed.filter(entry => entry.minute >= start && entry.minute < end)
    })),
    { label: 'Sem horário definido', timed: false, entries: entries.filter(entry => entry.minute === null) }
  ];
  const completed = entries.filter(entry => entry.done).length;
  const next = selected < today ? undefined : timed.find(entry =>
    !entry.done && (selected > today || entry.minute >= currentMinute)
  );
  const navigate = (offset: number) => {
    const target = iso(addDays(day, offset));
    onDateChange(target === today ? undefined : target);
  };

  return <div className="space-y-4">
    <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-1">
      <button type="button" aria-label="Dia anterior" onClick={() => navigate(-1)} className="grid size-11 place-items-center rounded-lg text-mu hover:bg-sf hover:text-tx">
        <ChevronLeft size={19} aria-hidden="true" />
      </button>
      <div className="text-center">
        <p className="text-sm font-semibold" aria-live="polite">
          {selected === today ? `Hoje, ${shortDate.format(day)}` : calendarDate.format(day)}
        </p>
        {selected !== today && <button type="button" onClick={() => onDateChange(undefined)} className="min-h-7 text-xs text-ac">Voltar para hoje</button>}
      </div>
      <button type="button" aria-label="Próximo dia" onClick={() => navigate(1)} className="grid size-11 place-items-center rounded-lg text-mu hover:bg-sf hover:text-tx">
        <ChevronRight size={19} aria-hidden="true" />
      </button>
    </div>

    <div role="group" aria-label="Progresso do dia">
      <div className="mb-2 flex justify-between gap-3 text-sm">
        <h2 className="font-medium">Progresso do dia</h2>
        <span className="text-ac tabular-nums" aria-label={`${completed} de ${entries.length} concluídos`}>{completed} de {entries.length}</span>
      </div>
      <Bar pct={entries.length ? completed / entries.length * 100 : 0} />
    </div>

    {!entries.length && <p className="section-empty">Nenhum hábito programado para este dia.</p>}
    {groups.filter(group => group.entries.length > 0).map(group => (
      <section key={group.label} className="pt-1">
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-mu uppercase">{group.label}</h2>
        <ul className={cx('relative', group.timed && 'before:absolute before:inset-y-3 before:left-[3.625rem] before:w-px before:bg-ln')}>
          {group.entries.map(({ habit, done, minute }) => {
            const upcoming = habit.id === next?.habit.id;
            const overdue = !done && minute !== null && (selected < today || (selected === today && minute < currentMinute));
            const status = done ? 'Concluído' : upcoming ? 'Próximo' : overdue ? 'Atrasado' : 'Pendente';

            return <li key={habit.id} className={cx(
              'relative grid min-h-13 items-center rounded-lg text-sm',
              group.timed ? 'grid-cols-[3.25rem_.75rem_minmax(0,1fr)_44px]' : 'grid-cols-[minmax(0,1fr)_44px] border-b border-ln last:border-0',
              upcoming && 'bg-ac/10'
            )}>
              {group.timed && <>
                <time className="pl-1 text-xs text-mu tabular-nums">{habit.time}</time>
                <span aria-hidden="true" className={cx(
                  'z-10 size-2 justify-self-center rounded-full border',
                  done || upcoming ? 'border-ac bg-ac' : overdue ? 'border-danger bg-bg' : 'border-mu bg-bg'
                )} />
              </>}
              <button type="button" onClick={() => onOpen(habit.id)} className="min-h-11 min-w-0 py-1 pr-1 pl-2 text-left">
                <span className={cx('block row-name', done && 'text-mu line-through')}>{habit.name}</span>
                <span className={cx('block text-xs', overdue ? 'text-danger' : upcoming ? 'font-semibold text-ac' : 'text-mu')}>{status}</span>
              </button>
              <CheckBtn on={done} onClick={() => onToggle(habit.id, selected)} label={`${done ? 'Desmarcar' : 'Concluir'} ${habit.name}`} />
            </li>;
          })}
        </ul>
      </section>
    ))}
  </div>;
}
