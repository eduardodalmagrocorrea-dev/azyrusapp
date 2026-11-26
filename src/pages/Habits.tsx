
import { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { useLocal } from '../hooks';
import type { Habit, Setter } from '../types';
import { Btn, Empty, Field, Head, Sel, Sheet, cx } from '../ui';
import { addDays, DOW, due, freq, habitTime, iso, MILESTONES, streaks, today, uid, validHabitTime } from '../utils';
import HabitTimeline from './HabitTimeline';

const CATS = ['Pessoal', 'Estudos', 'Saúde', 'Trabalho', 'Outro'];

type P = {
  habits: Habit[];
  setHabits: Setter<Habit[]>;
  say: (m: string) => void;
};

const blank = (): Habit => ({
  id: '',
  name: '',
  category: 'Pessoal',
  days: [0, 1, 2, 3, 4, 5, 6],
  time: '',
  reminderEnabled: false,
  done: [],
  created: today(),
});

export default function Habits({ habits, setHabits, say }: P) {
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState<Habit | null>(null);
  const [view, setView] = useLocal<{ mode: 'list' | 'timeline' }>('azyrus-habits-view', { mode: 'list' });
  const [timelineDate, setTimelineDate] = useState<string>();

  const t = new Date();
  const ts = today();

  const todayHabits = habits.filter(h => due(h, t));
  const completed = todayHabits.filter(h => h.done.includes(ts)).length;

  const toggle = (id: string, date = ts) => {
    const h = habits.find(x => x.id === id);
    if (!h) return;

    const on = h.done.includes(date);
    setHabits(l => l.map(x => x.id !== id ? x : {
      ...x,
      done: x.done.includes(date) ? x.done.filter(day => day !== date) : [...x.done, date]
    }));

    if (on) {
      say('Hábito desmarcado');
    } else {
      const c = date === ts ? streaks({ ...h, done: [...h.done, date] }).cur : 0;
      say(
        MILESTONES.includes(c)
          ? `Marco de ${c} dias atingido`
          : 'Hábito concluído'
      );
    }
  };

  const save = () => {
    if (!form || !form.name.trim() || form.days.length === 0) return;
    if (form.reminderEnabled && form.days.some(day => !validHabitTime(habitTime(form, day)))) {
      say('Informe um horário para cada dia ativo do lembrete.');
      return;
    }

    const h = {
      ...form,
      name: form.name.trim(),
      id: form.id || uid(),
    };

    setHabits(l =>
      form.id
        ? l.map(x => x.id === form.id ? h : x)
        : [...l, h]
    );

    setForm(null);
  };

  const remove = (h: Habit) => {
    if (!confirm(`Excluir "${h.name}" e todo o histórico?`)) return;

    setHabits(l => l.filter(x => x.id !== h.id));
    setSel(null);
  };

  const cur = habits.find(h => h.id === sel);

  return (
    <>
      <Head
        title="Hábitos"
        action={
          <Btn
            onClick={() => setForm(blank())}
            aria-label="Novo hábito"
            className="!px-0 w-12"
          >
            <Plus size={22} />
          </Btn>
        }
      />

      <div role="group" aria-label="Visualização de hábitos" className="segmented grid-cols-2 mb-4">
        <button type="button" aria-pressed={view.mode !== 'timeline'} onClick={() => setView({ mode: 'list' })}
          className="min-h-11 rounded-lg text-sm text-mu">Lista</button>
        <button type="button" aria-pressed={view.mode === 'timeline'} onClick={() => setView({ mode: 'timeline' })}
          className="min-h-11 rounded-lg text-sm text-mu">Linha do tempo</button>
      </div>

      {view.mode === 'timeline' ? (
        <HabitTimeline habits={habits} date={timelineDate} onDateChange={setTimelineDate} onToggle={toggle} onOpen={setSel} />
      ) : habits.length === 0 ? (
        <Empty
          text="Nenhum hábito ainda. Comece com um só."
          action={
            <Btn onClick={() => setForm(blank())}>
              Criar hábito
            </Btn>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-mu">
              Hábitos de hoje
            </p>
            <p className="text-xs text-mu">
              {completed}/{todayHabits.length} concluídos
            </p>
          </div>

          <div className="data-list">
            {[...todayHabits, ...habits.filter(habit => !due(habit, t))].map(h => {
              const done = h.done.includes(ts);
              const isDue = due(h, t);

              return (
                <div
                  key={h.id}
                  className={cx(
                    'data-row'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggle(h.id)}
                    aria-label={`Marcar ${h.name}`}
                    aria-pressed={done}
                    className={cx(
                      'size-11 shrink-0 grid place-items-center'
                    )}
                  >
                    <span className={cx('row-mark', done && 'is-complete')}>{done && <Check size={14} strokeWidth={3} />}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSel(h.id)}
                    className="flex-1 min-w-0 min-h-11 text-left"
                    title={`${h.name} · ${freq(h)}${isDue && habitTime(h, t.getDay()) ? ` · ${habitTime(h, t.getDay())}` : ''}`}
                  >
                    <span
                      className={cx(
                        'block row-name',
                        done && 'line-through text-mu'
                      )}
                    >
                      {h.name}
                    </span>
                    <span className="row-detail">{isDue ? freq(h) : 'Fora da programação de hoje'}{isDue && habitTime(h, t.getDay()) && ` · ${habitTime(h, t.getDay())}`}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {cur && (() => {
        const s = streaks(cur);
        const next = MILESTONES.find(m => m > s.cur);
        const days = Array.from(
          { length: 14 },
          (_, i) => addDays(t, i - 13)
        );

        return (
          <Sheet title={cur.name} onClose={() => setSel(null)}>
            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              {[
                ['Sequência', s.cur],
                ['Melhor', s.best],
                ['Cumpridos', s.total],
              ].map(([l, v]) => (
                <div key={String(l)} className="rounded-xl bg-bg p-3">
                  <p className="text-2xl font-light">{v}</p>
                  <p className="text-xs text-mu">{l}</p>
                </div>
              ))}
            </div>

            <p className="text-sm text-mu mb-2">
              {freq(cur)}
              {due(cur, t) && habitTime(cur, t.getDay()) && ` · ${habitTime(cur, t.getDay())}`}
            </p>

            <p className="text-mu mb-4">
              {next
                ? `Próximo marco: ${next} dias (faltam ${next - s.cur})`
                : 'Todos os marcos atingidos.'}
            </p>

            <p className="text-sm text-mu mb-2">Últimos 14 dias</p>

            <div className="grid grid-cols-7 gap-1.5 mb-5">
              {days.map(d => {
                const k = iso(d);
                const done = cur.done.includes(k);
                const miss =
                  !done &&
                  due(cur, d) &&
                  k < ts &&
                  k >= cur.created;

                return (
                  <div
                    key={k}
                    className={cx(
                      'h-11 rounded-lg grid place-items-center text-sm',
                      done
                        ? 'bg-ac text-on font-bold'
                        : 'border border-ln text-mu'
                    )}
                  >
                    {done ? '✓' : miss ? '×' : '·'}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Btn
                variant="ghost"
                onClick={() => {
                  setForm(cur);
                  setSel(null);
                }}
              >
                Editar
              </Btn>

              <Btn variant="danger" onClick={() => remove(cur)}>
                <Trash2 size={18} />
                Excluir
              </Btn>
            </div>
          </Sheet>
        );
      })()}

      {form && (
        <Sheet
          title={form.id ? 'Editar hábito' : 'Novo hábito'}
          onClose={() => setForm(null)}
        >
          <Field
            label="Nome"
            value={form.name}
            onChange={e =>
              setForm({ ...form, name: e.target.value })
            }
            placeholder="Ex.: Ler 20 minutos"
            autoFocus
          />

          <Sel
            label="Categoria"
            value={form.category}
            onChange={e =>
              setForm({ ...form, category: e.target.value })
            }
          >
            {CATS.map(c => (
              <option key={c}>{c}</option>
            ))}
          </Sel>

          <p className="text-sm text-mu">Dias</p>

          <div className="grid grid-cols-7 gap-1.5 mt-1 mb-3">
            {DOW.map((d, i) => {
              const on = form.days.includes(i);

              return (
                <button
                  key={d}
                  aria-pressed={on}
                  onClick={() =>
                    setForm({
                      ...form,
                      days: on
                        ? form.days.filter(x => x !== i)
                        : [...form.days, i].sort(),
                    })
                  }
                  className={cx(
                    'h-11 rounded-lg text-xs',
                    on
                      ? 'bg-ac text-on font-semibold'
                      : 'border border-ln text-mu'
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <Field
            label="Horário padrão"
            type="time"
            value={form.time}
            onChange={e =>
              setForm({ ...form, time: e.target.value })
            }
          />

          <details className="mb-3 rounded-xl border border-ln p-3">
            <summary className="cursor-pointer text-sm">Horários por dia</summary>
            <p className="my-2 text-xs text-mu">Campos vazios usam o horário padrão.</p>
            <div className="grid grid-cols-2 gap-x-3">
              {form.days.map(day => <Field key={day} label={DOW[day]} type="time"
                value={form.dayTimes?.[day] ?? ''}
                onChange={e => {
                  const dayTimes = { ...form.dayTimes };
                  if (e.target.value) dayTimes[day] = e.target.value;
                  else delete dayTimes[day];
                  setForm({ ...form, dayTimes });
                }} />)}
            </div>
          </details>

          <label className="flex items-center gap-3 py-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.reminderEnabled}
              onChange={e =>
                setForm({
                  ...form,
                  reminderEnabled: e.target.checked,
                })
              }
            />
            Ativar notificações para este hábito
          </label>

          <Btn
            className="w-full mt-2"
            onClick={save}
            disabled={!form.name.trim() || form.days.length === 0}
          >
            Salvar hábito
          </Btn>
        </Sheet>
      )}
    </>
  );
}
