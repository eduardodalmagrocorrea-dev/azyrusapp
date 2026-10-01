import { Flame } from 'lucide-react';
import type { Goal, Habit, Tab, Task } from '../types';
import { Card, Bar } from '../ui';
import { due, fmtDate, goalPct, iso, streaks } from '../utils';

type P = { name: string; habits: Habit[]; tasks: Task[]; goals: Goal[]; go: (t: Tab) => void };

export default function Home({ name, habits, tasks, goals, go }: P) {
  const t = new Date(), ts = iso(t);
  const hd = habits.filter((h) => due(h, t));
  const hDone = hd.filter((h) => h.done.includes(ts)).length;
  const td = tasks.filter((x) => x.date === ts);
  const total = hd.length + td.length;
  const dn = hDone + td.filter((x) => x.done).length;
  const pct = total ? Math.round((dn / total) * 100) : 0;
  const next = tasks.filter((x) => !x.done).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 3);
  const active = goals.filter((g) => g.status === 'ativa').slice(0, 3);
  const best = habits.reduce((m, h) => Math.max(m, streaks(h).cur), 0);
  const R = 38, C = 2 * Math.PI * R;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Olá, {name}.</h1>
          <p className="text-mu capitalize mt-1">{t.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <svg width="88" height="88" viewBox="0 0 88 88" role="img" aria-label={`Progresso do dia: ${pct}%`}>
          <circle cx="44" cy="44" r={R} fill="none" stroke="var(--ln)" strokeWidth="4" />
          <circle cx="44" cy="44" r={R} fill="none" stroke="var(--ac)" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={`${(C * pct) / 100} ${C}`} transform="rotate(-90 44 44)" />
          <text x="44" y="49" textAnchor="middle" fill="var(--tx)" fontSize="17">{pct}%</text>
        </svg>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium">Hábitos de hoje</p>
          <button onClick={() => go('habits')} className="text-sm text-ac">Ver todos</button>
        </div>
        {hd.length === 0 ? <p className="text-sm text-mu">Nenhum hábito programado para hoje.</p> :
          <div className="space-y-2">
            {hd.slice(0, 4).map((h) => (
              <div key={h.id} className="flex items-center gap-3">
                <span className={h.done.includes(ts) ? 'size-6 rounded-full bg-ac text-on grid place-items-center text-xs' : 'size-6 rounded-full border border-ln'}>{h.done.includes(ts) ? '✓' : ''}</span>
                <span className={h.done.includes(ts) ? 'line-through text-mu' : ''}>{h.name}</span>
              </div>
            ))}
          </div>
        }
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <p className="font-medium">Sequência atual</p>
          <Flame size={18} className={best ? 'text-ac' : 'text-mu'} />
        </div>
        <p className="text-3xl font-light mt-2">{best} <span className="text-base text-mu">dias</span></p>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium">Próximas tarefas</p>
          <button onClick={() => go('tasks')} className="text-sm text-ac">Ver todas</button>
        </div>
        {next.length === 0 ? <p className="text-sm text-mu">Nenhuma tarefa pendente.</p> :
          <div className="space-y-2">{next.map((x) => <div key={x.id} className="flex justify-between gap-3"><span>{x.title}</span><span className="text-sm text-mu">{fmtDate(x.date)}</span></div>)}</div>}
      </Card>

      <Card>
        <p className="font-medium mb-3">Metas ativas</p>
        {active.length === 0 ? <p className="text-sm text-mu">Nenhuma meta ativa.</p> :
          <div className="space-y-4">
            {active.map((g) => <div key={g.id}><div className="flex justify-between text-sm mb-2"><span>{g.title}</span><span className="text-mu">{Math.round(goalPct(g))}%</span></div><Bar pct={goalPct(g)} /></div>)}
          </div>}
      </Card>
    </div>
  );
}