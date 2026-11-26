import { CalendarDays, Check, ChevronRight, Dumbbell } from 'lucide-react';
import type { Habit, Tab, Task, Workout } from '../types';
import { cx } from '../ui';
import { due, habitTime, today } from '../utils';

type Props = { name: string; habits: Habit[]; tasks: Task[]; workouts: Workout[]; go: (tab: Tab, weekday?: number) => void };

const weekdays = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

export default function Home({ name, habits, tasks, workouts, go }: Props) {
  const date = new Date();
  const key = today();
  const scheduled = habits.filter(habit => due(habit, date));
  const done = scheduled.filter(habit => habit.done.includes(key)).length;
  const pct = scheduled.length ? Math.round(done / scheduled.length * 100) : 0;
  const events = tasks.filter(task => task.date === key).sort((a, b) => a.time.localeCompare(b.time));
  const training = workouts.map(workout => {
    const weekday = workout.day ?? new Date(workout.date + 'T12:00:00').getDay();
    return { workout, weekday, offset: (weekday - date.getDay() + 7) % 7 };
  }).filter(item => Number.isFinite(item.offset)).sort((a, b) => a.offset - b.offset);
  const next = training[0];
  const todayTraining = training.filter(item => item.offset === 0);

  return <div className="dashboard">
    <header className="mb-5 sm:mb-6">
      <p className="text-sm text-mu first-letter:uppercase">{date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <h1 className="page-title mt-2">{name.trim() ? `Olá, ${name}.` : 'Seu dia'}</h1>
    </header>

    <section className="daily-progress" aria-labelledby="daily-progress-title">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-mu" id="daily-progress-title">Progresso diário</h2>
        <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{done} <span className="text-mu">/ {scheduled.length}</span></p>
        <p className="mt-1 text-sm text-mu">Hábitos concluídos</p>
      </div>
      <div className="progress-ring" role="progressbar" aria-label="Hábitos concluídos" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <svg viewBox="0 0 88 88" aria-hidden="true">
          <circle cx="44" cy="44" r="37" className="ring-track" />
          <circle cx="44" cy="44" r="37" pathLength="100" strokeDasharray={`${pct} 100`} className="ring-value" />
        </svg>
        <span aria-hidden="true">{pct}%</span>
      </div>
    </section>

    <div className="dashboard-agenda">
      <section>
        <div className="section-heading"><h2>Hábitos de hoje</h2><button onClick={() => go('habits')}>Ver todos <ChevronRight size={15} /></button></div>
        {!scheduled.length && <p className="section-empty">Nenhum hábito programado para hoje.</p>}
        <ul className="data-list">
          {scheduled.map(habit => <li className="data-row" key={habit.id}>
            <span className={cx('row-mark', habit.done.includes(key) && 'is-complete')} aria-label={habit.done.includes(key) ? 'Concluído' : 'Pendente'}>{habit.done.includes(key) && <Check size={14} />}</span>
            <span className="row-name">{habit.name}</span>
            {habitTime(habit, date.getDay()) && <time className="row-detail">{habitTime(habit, date.getDay())}</time>}
          </li>)}
        </ul>
      </section>
      <div className="space-y-3 sm:space-y-5">
        <section>
          <div className="section-heading"><h2>{todayTraining.length ? 'Treinos de hoje' : 'Próximo treino'}</h2><button onClick={() => go('workouts', next?.weekday)}>Ver treinos <ChevronRight size={15} /></button></div>
          {!next && <p className="section-empty">Nenhum treino programado.</p>}
          <ul className="data-list">
            {(todayTraining.length ? todayTraining : next ? [next] : []).map(({ workout, weekday, offset }) => <li className="data-row" key={workout.id}>
              <Dumbbell className="row-icon" size={19} />
              <div className="min-w-0"><p className="row-name">{workout.name}</p><p className="row-detail">{offset === 0 ? 'Hoje' : weekdays[weekday]} · {workout.exercises.length} {workout.exercises.length === 1 ? 'exercício' : 'exercícios'}</p></div>
            </li>)}
          </ul>
        </section>
        <section>
          <div className="section-heading"><h2>Compromissos de hoje</h2><button onClick={() => go('tasks')}>Calendário <ChevronRight size={15} /></button></div>
          {!events.length && <p className="section-empty">Nenhum compromisso para hoje.</p>}
          <ul className="data-list">
            {events.map(event => <li className="data-row" key={event.id}>
              <CalendarDays className="row-icon" size={18} />
              <span className={cx('row-name', event.done && 'line-through text-mu')}>{event.title}</span>
              {event.time && <time className="row-detail">{event.time}</time>}
            </li>)}
          </ul>
        </section>
      </div>
    </div>
  </div>;
}
