
import { useCallback, useEffect, useState } from 'react';
import {
  Asterisk,
  CalendarDays,
  ChevronLeft,
  Ellipsis,
  Dumbbell,
  Flame,
  Home as HomeIcon,
  Sparkles,
  Target
} from 'lucide-react';

import { useLocal, useStore } from './hooks';

import type {
  Goal,
  Habit,
  MealEntry,
  MorePage,
  FinanceTransaction,
  Note,
  Settings,
  Tab,
  Task,
  WaterEntry,
  Workout
} from './types';

import { Btn, Field, cx } from './ui';

import Home from './pages/Home';
import Habits from './pages/Habits';
import Tasks from './pages/Tasks';
import Goals from './pages/Goals';
import More, {
  type NavigationLayout
} from './pages/More';
import Workouts from './pages/Workouts';
import Diet from './pages/Diet';
import Finance from './pages/Finance';
import History from './pages/History';
import PasswordGate from './PasswordGate';
import Assistant from './Assistant';
import { listTargets, type AICollections, type AIReview } from './aiBatch';
import { dbCommitBatch } from './db';
import { loadPreviousNotes } from './notes';

import {
  subscribeToPush,
  syncHabitReminders
} from './notifications';

const TABS: [Tab, string, typeof HomeIcon][] = [
  ['home', 'Início', HomeIcon],
  ['habits', 'Hábitos', Flame],
  ['workouts', 'Treinos', Dumbbell],
  ['tasks', 'Calendário', CalendarDays],
  ['goals', 'Metas', Target],
  ['more', 'Mais', Ellipsis]
];

const DEFAULT_NAVIGATION: NavigationLayout = {
  bar: [
    'home',
    'habits',
    'workouts',
    'tasks'
  ],
  settings: ['goals']
};

export default function App() {
  const [st, setSt] = useLocal<Settings>(
    'azyrus-settings',
    {
      name: '',
      theme: 'dark',
      onboarded: false
    }
  );

  const [savedNavigation, setSavedNavigation] =
    useLocal<NavigationLayout>(
      'azyrus-navigation',
      DEFAULT_NAVIGATION
    );

  const isPreviousDefault = (layout: NavigationLayout) =>
    layout.version === undefined && layout.bar.join(',') === 'home,habits,workouts,tasks,goals' && layout.settings.length === 0;
  const navigation = isPreviousDefault(savedNavigation) ? DEFAULT_NAVIGATION : savedNavigation;

  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  useEffect(() => {
    localStorage.removeItem('azyrus-authenticated');
    fetch('/api/auth', { cache: 'no-store' })
      .then(async response => { if (!response.ok) throw new Error(); const data = await response.json(); setAuthenticated(data.authenticated === true); })
      .catch(() => setAuthError(true)).finally(() => setCheckingAuth(false));
  }, []);

  const [habits, setHabits, r1, e1, habitStore] =
    useStore<Habit[]>('habits', []);

  const [tasks, setTasks, r2, e2, taskStore] =
    useStore<Task[]>('tasks', []);

  const [goals, setGoals, r3, e3, goalStore] =
    useStore<Goal[]>('goals', []);

  const [workouts, setWorkouts, r4, e4, workoutStore] =
    useStore<Workout[]>('workouts', []);

  const [meals, setMeals, r5, e5, mealStore] =
    useStore<MealEntry[]>('meals', []);

  const [water, setWater, r6, e6, waterStore] =
    useStore<WaterEntry[]>('water', []);

  const [finance, setFinance, r7, e7, financeStore] =
    useStore<FinanceTransaction[]>('finance', []);

  const [notes, setNotes, notesReady, notesError, noteStore] =
    useStore<Note[]>('notes', [], loadPreviousNotes);

  const [tab, setTab] = useState<Tab>('home');
  const [workoutDay, setWorkoutDay] = useState<number>();

  const [morePage, setMorePage] =
    useState<MorePage>('more');

  const [msg, setMsg] = useState('');

  const say = useCallback((m: string) => {
    setMsg(!/não|nao|erro|falh/i.test(m) && /salv|adicionad|atualizad|excluíd|excluid|registrad/i.test(m) ? 'Salvando alteração...' : m);
    window.setTimeout(() => setMsg(''), 1800);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle(
      'dark',
      st.theme === 'dark'
    );

    document
      .querySelector('meta[name=theme-color]')
      ?.setAttribute(
        'content',
        st.theme === 'dark'
          ? '#09090B'
          : '#F5F5F7'
      );
  }, [st.theme]);

  useEffect(() => {
    if (!r1 || !authenticated || !st.onboarded) {
      return;
    }

    syncHabitReminders(habits).catch(error => {
      console.error(
        'Erro ao sincronizar lembretes:',
        error
      );
    });
  }, [habits, r1, authenticated, st.onboarded]);

  const aiCollections: AICollections = {
    habit: habits, event: tasks, goal: goals, workout: workouts,
    meal: meals, water, finance, note: notes,
  };

  const confirmAI = async (review: AIReview) => {
    if (!review.valid) throw new Error('Resolva as pendências antes de confirmar.');
    if (storageErrors.some(Boolean)) throw new Error('Aguarde o salvamento das alterações anteriores ou use Tentar salvar.');
    const stores = {
      habit: ['habits', habitStore], event: ['tasks', taskStore],
      goal: ['goals', goalStore], workout: ['workouts', workoutStore],
      meal: ['meals', mealStore], water: ['water', waterStore],
      finance: ['finance', financeStore], note: ['notes', noteStore],
    } as const;
    const writes = Array.from(review.changes, ([type, after]) => {
      const [key, store] = stores[type];
      if (!store.isSaved) throw new Error('Aguarde o salvamento das alterações anteriores.');
      // The planner maintains the record type of each collection.
      const publish = store.adopt as (value: typeof after) => void;
      return { key, before: store.stored.current, after, publish };
    });
    await dbCommitBatch(writes);
    writes.forEach(({ after, publish }) => publish(after));
  };

  const enableNotifications = async () => {
    try {
      const subscribed = await subscribeToPush();

      if (subscribed) {
        await syncHabitReminders(habits);
        say('Notificações ativadas.');
      } else {
        say('Permissão para notificações negada.');
      }
    } catch (error) {
      console.error(
        'Erro ao ativar notificações:',
        error
      );

      say('Erro ao ativar notificações.');
    }
  };

  const visibleTabs: Tab[] = [
    ...navigation.bar,
    'more'
  ];

  const storageErrors = [e1, e2, e3, e4, e5, e6, e7, notesError];
  if (storageErrors.includes('read')) return <div className="h-dvh grid place-items-center px-6 text-center"><div><p>Não foi possível ler os dados deste aparelho. Nenhum dado foi substituído.</p><Btn className="mt-4" onClick={() => window.location.reload()}>Tentar novamente</Btn></div></div>;
  if (!(r1 && r2 && r3 && r4 && r5 && r6 && r7 && notesReady)) {
    return (
      <div className="h-dvh grid place-items-center text-2xl font-light tracking-[.3em]">
        AZYRUS
      </div>
    );
  }

  if (checkingAuth) return <div className="h-dvh grid place-items-center">Verificando acesso...</div>;
  if (authError) return <div className="h-dvh grid place-items-center px-6 text-center">Não foi possível verificar o acesso. Confira sua conexão e recarregue a página.</div>;
  if (!authenticated) {
    return (
      <PasswordGate
        onUnlock={() => setAuthenticated(true)}
      />
    );
  }

  if (!st.onboarded) {
    return (
      <Welcome
        st={st}
        setSt={setSt}
      />
    );
  }

  const page =
    tab === 'home' ? (
      <Home
        name={st.name}
        habits={habits}
        tasks={tasks}
        workouts={workouts}
        go={(id, weekday) => {
          setWorkoutDay(weekday);
          setTab(id);
          setMorePage('more');
        }}
      />
    ) : tab === 'habits' ? (
      <Habits
        habits={habits}
        setHabits={setHabits}
        say={say}
      />
    ) : tab === 'workouts' ? (
      <Workouts
        workouts={workouts}
        setWorkouts={setWorkouts}
        initialDay={workoutDay}
        say={say}
      />
    ) : tab === 'tasks' ? (
      <Tasks
        notes={notes}
        setNotes={setNotes}
        tasks={tasks}
        setTasks={setTasks}
        say={say}
      />
    ) : tab === 'goals' ? (
      <Goals
        goals={goals}
        setGoals={setGoals}
        say={say}
      />
    ) : morePage === 'workouts' ? (
      <Workouts
        workouts={workouts}
        setWorkouts={setWorkouts}
        say={say}
      />
    ) : morePage === 'diet' ? (
      <Diet
        meals={meals}
        setMeals={setMeals}
        water={water}
        setWater={setWater}
        say={say}
      />
    ) : morePage === 'finance' ? (
      <Finance
        items={finance}
        setItems={setFinance}
        say={say}
      />
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
        data={{
          habits,
          tasks,
          goals,
          workouts,
          meals,
          water,
          finance
        }}
        setHabits={setHabits}
        setTasks={setTasks}
        setGoals={setGoals}
        setWorkouts={setWorkouts}
        setMeals={setMeals}
        setWater={setWater}
        setFinance={setFinance}
        setPage={setMorePage}
        say={say}
        onEnableNotifications={enableNotifications}
        navigation={navigation}
        setNavigation={update => setSavedNavigation(current => ({
          ...(typeof update === 'function' ? update(isPreviousDefault(current) ? DEFAULT_NAVIGATION : current) : update),
          version: 2
        }))}
        onOpenTab={id => {
          setWorkoutDay(undefined);
          setTab(id);
          setMorePage('more');
        }}
      />
    );

  return (
    <div className="h-dvh flex flex-col">
      <main key={tab + ':' + morePage} ref={element => { if (element) element.inert = showAssistant; }} className="app-main min-h-0 flex-1 overflow-y-auto">
        <div className="app-content" data-page={tab}>
          <header className="app-brand">
            <span className="wordmark"><Asterisk className="brand-symbol" size={22} strokeWidth={2.5} aria-hidden="true" />AZYRUS</span>
            <button type="button" onClick={() => setShowAssistant(true)} className="ai-shortcut" aria-label="Abrir AZYRUS AI"><Sparkles size={16} aria-hidden="true" /> AI</button>
          </header>
          {tab === 'more' &&
            morePage !== 'more' && (
              <button
                onClick={() =>
                  setMorePage('more')
                }
                className="inline-flex min-h-11 items-center gap-1 text-sm text-ac mb-2"
              >
                <ChevronLeft size={16} aria-hidden="true" /> Mais
              </button>
            )}

          {tab !== 'more' &&
            navigation.settings.includes(tab) && (
              <button
                onClick={() => {
                  setTab('more');
                  setMorePage('more');
                }}
                className="inline-flex min-h-11 items-center gap-1 text-sm text-ac mb-2"
              >
                <ChevronLeft size={16} aria-hidden="true" /> Mais
              </button>
            )}

          {page}
        </div>
      </main>

      {storageErrors.includes('write') ? <div role="alert" className="fixed top-0 inset-x-0 z-50 bg-red-800 text-white p-3 text-center text-sm">Não foi possível salvar os dados. Mantenha o aplicativo aberto e tente novamente. <button className="underline" onClick={() => window.dispatchEvent(new Event('azyrus-retry-save'))}>Tentar salvar</button></div> : storageErrors.includes('saving') ? <div role="status" className="fixed top-0 inset-x-0 z-50 bg-sf text-tx p-2 text-center text-sm">Salvando alterações...</div> : null}
      {showAssistant && <Assistant onClose={() => setShowAssistant(false)} onConfirm={confirmAI} collections={aiCollections} targets={listTargets(aiCollections)} />}
      <nav
        ref={element => { if (element) element.inert = showAssistant; }}
        className="app-nav shrink-0"
        aria-label="Navegação principal"
      >
        <div
          className="mx-auto max-w-xl grid h-15"
          style={{
            gridTemplateColumns:
              `repeat(${visibleTabs.length}, minmax(0, 1fr))`
          }}
        >
          {visibleTabs.map(id => {
            const item = TABS.find(
              ([key]) => key === id
            );

            if (!item) return null;

            const [, label, Icon] = item;

            const active = tab === id || (id === 'more' && !navigation.bar.some(item => item === tab));

            return (
              <button
                key={id}
                onClick={() => {
                  setWorkoutDay(undefined);
                  setTab(id);
                  setMorePage('more');
                }}
                aria-current={
                  active
                    ? 'page'
                    : undefined
                }
                className={cx(
                  'flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium min-w-0',
                  active
                    ? 'text-ac'
                    : 'text-mu'
                )}
              >
                <span className="nav-icon"><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></span>

                <span className="truncate max-w-full px-1">
                  {label}
                </span>
              </button>
            );
          })}
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
          onChange={e =>
            setName(e.target.value)
          }
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
