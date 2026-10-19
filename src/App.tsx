
import { useCallback, useEffect, useState } from 'react';
import {
  Dumbbell,
  Flame,
  Home as HomeIcon,
  ListChecks,
  Menu,
  Target
} from 'lucide-react';
import { useLocal, useStore } from './hooks';
import type {
  Goal,
  Habit,
  MealEntry,
  MorePage,
  FinanceTransaction,
  Settings,
  Tab,
  Task,
  WaterEntry,
  Workout
} from './types';
import { today } from './utils';
import { Btn, Field, cx } from './ui';
import Home from './pages/Home';
import Habits from './pages/Habits';
import Tasks from './pages/Tasks';
import Goals from './pages/Goals';
import More from './pages/More';
import Workouts from './pages/Workouts';
import Diet from './pages/Diet';
import Finance from './pages/Finance';
import History from './pages/History';
import PasswordGate from './PasswordGate';
import { subscribeToPush } from './notifications';

const TABS: [Tab, string, typeof HomeIcon][] = [
  ['home', 'Início', HomeIcon],
  ['habits', 'Hábitos', Flame],
  ['workouts', 'Treinos', Dumbbell],
  ['tasks', 'Calendário', ListChecks],
  ['goals', 'Metas', Target],
  ['more', 'Mais', Menu]
];

export default function App() {
  const [st, setSt] = useLocal<Settings>('azyrus-settings', {
    name: '',
    theme: 'dark',
    onboarded: false
  });

  const [authenticated, setAuthenticated] = useState(
    () => localStorage.getItem('azyrus-authenticated') === 'true'
  );

  const [habits, setHabits, r1] = useStore<Habit[]>('habits', []);
  const [tasks, setTasks, r2] = useStore<Task[]>('tasks', []);
  const [goals, setGoals, r3] = useStore<Goal[]>('goals', []);
  const [workouts, setWorkouts, r4] = useStore<Workout[]>('workouts', []);
  const [meals, setMeals, r5] = useStore<MealEntry[]>('meals', []);
  const [water, setWater, r6] = useStore<WaterEntry[]>('water', []);
  const [finance, setFinance, r7] =
    useStore<FinanceTransaction[]>('finance', []);

  const [tab, setTab] = useState<Tab>('home');
  const [morePage, setMorePage] = useState<MorePage>('more');
  const [msg, setMsg] = useState('');

  const say = useCallback((m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(''), 1800);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', st.theme === 'dark');
    document.querySelector('meta[name=theme-color]')?.setAttribute(
      'content',
      st.theme === 'dark' ? '#0C1019' : '#F4F5F9'
    );
  }, [st.theme]);

  if (!(r1 && r2 && r3 && r4 && r5 && r6 && r7)) {
    return (
      <div className="h-dvh grid place-items-center text-2xl font-light tracking-[.3em]">
        AZYRUS
      </div>
    );
  }

  if (!authenticated) {
    return <PasswordGate onUnlock={() => setAuthenticated(true)} />;
  }

  if (!st.onboarded) {
    return <Welcome st={st} setSt={setSt} />;
  }

  const page =
    tab === 'home' ? (
      <Home
        name={st.name}
        habits={habits}
        tasks={tasks}
        goals={goals}
        go={setTab}
      />
    ) : tab === 'habits' ? (
      <Habits habits={habits} setHabits={setHabits} say={say} />
    ) : tab === 'workouts' ? (
      <Workouts workouts={workouts} setWorkouts={setWorkouts} say={say} />
    ) : tab === 'tasks' ? (
      <Tasks tasks={tasks} setTasks={setTasks} say={say} />
    ) : tab === 'goals' ? (
      <Goals goals={goals} setGoals={setGoals} say={say} />
    ) : morePage === 'workouts' ? (
      <Workouts workouts={workouts} setWorkouts={setWorkouts} say={say} />
    ) : morePage === 'diet' ? (
      <Diet
        meals={meals}
        setMeals={setMeals}
        water={water}
        setWater={setWater}
        say={say}
      />
    ) : morePage === 'finance' ? (
      <Finance items={finance} setItems={setFinance} say={say} />
    ) : morePage === 'history' ? (
      <History
        habits={habits}
        tasks={tasks}
        goals={goals}
        workouts={workouts}
        meals={meals}
        finance={finance}
      />
    ) : (
      <More
        st={st}
        setSt={setSt}
        data={{ habits, tasks, goals, workouts, meals, water, finance }}
        setHabits={setHabits}
        setTasks={setTasks}
        setGoals={setGoals}
        setWorkouts={setWorkouts}
        setMeals={setMeals}
        setWater={setWater}
        setFinance={setFinance}
        setPage={setMorePage}
        say={say}
      />
    );

  return (
    <div className="h-dvh flex flex-col">
      <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 flex gap-2">
        <button
          onClick={async () => {
            try {
              const subscribed = await subscribeToPush();

              if (subscribed) {
                say('Notificações ativadas.');
              } else {
                say('Permissão para notificações negada.');
              }
            } catch (error) {
              console.error(error);
              say('Erro ao ativar notificações.');
            }
          }}
          className="rounded-full bg-ac px-3 py-2 text-xs text-bg shadow-lg"
        >
          Testar notificações
        </button>
      </div>

      <main className="flex-1 overflow-y-auto px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-8">
        <div className="mx-auto max-w-md">
          {tab === 'more' && morePage !== 'more' && (
            <button
              onClick={() => setMorePage('more')}
              className="text-sm text-ac mb-4"
            >
              ← Voltar
            </button>
          )}
          {page}
        </div>
      </main>

      <nav
        className="shrink-0 border-t border-ln bg-sf pb-[env(safe-area-inset-bottom)]"
        aria-label="Navegação principal"
      >
        <div className="mx-auto max-w-md grid grid-cols-6 h-16">
          {TABS.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                if (id !== 'more') setMorePage('more');
              }}
              aria-current={tab === id ? 'page' : undefined}
              className={cx(
                'flex flex-col items-center justify-center gap-1 text-xs',
                tab === id ? 'text-ac' : 'text-mu'
              )}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {msg && (
        <div
          role="status"
          className="fixed left-1/2 -translate-x-1/2 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 rounded-full bg-tx text-bg px-4 py-2 text-sm shadow-lg"
        >
          {msg}
        </div>
      )}
    </div>
  );
}

function Welcome({
  st,
  setSt
}: {
  st: Settings;
  setSt: (s: Settings) => void;
}) {
  const [name, setName] = useState('');

  const finish = () => {
    const cleanName = name.trim();

    if (!cleanName) return;

    setSt({
      ...st,
      name: cleanName,
      onboarded: true
    });
  };

  return (
    <div className="h-dvh overflow-y-auto px-6 pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md">
        <p className="text-sm tracking-[.3em] text-ac mb-8">
          AZYRUS
        </p>

        <h1 className="text-4xl font-light tracking-tight mb-2">
          Bem-vindo.
        </h1>

        <p className="text-mu mb-8">
          Sua rotina, do seu jeito.
        </p>

        <Field
          label="Seu nome"
          placeholder="Digite seu nome"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <Btn
          className="w-full mt-4"
          onClick={finish}
          disabled={!name.trim()}
        >
          Começar
        </Btn>
      </div>
    </div>
  );
}
