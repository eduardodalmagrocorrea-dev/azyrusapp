
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
import type { AITarget } from './Assistant';
import type { Proposal } from './aiProposals';
import { applyExerciseChange, makeExercise } from './aiWorkout';
import { today, uid } from './utils';

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

  const [habits, setHabits, r1, e1] =
    useStore<Habit[]>('habits', []);

  const [tasks, setTasks, r2, e2] =
    useStore<Task[]>('tasks', []);

  const [goals, setGoals, r3, e3] =
    useStore<Goal[]>('goals', []);

  const [workouts, setWorkouts, r4, e4] =
    useStore<Workout[]>('workouts', []);

  const [meals, setMeals, r5, e5] =
    useStore<MealEntry[]>('meals', []);

  const [water, setWater, r6, e6] =
    useStore<WaterEntry[]>('water', []);

  const [finance, setFinance, r7, e7] =
    useStore<FinanceTransaction[]>('finance', []);

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

  const confirmAI = (items: Proposal[]) => {
    if (items.some(item => item.action === 'update')) {
      if (items.length !== 1) throw new Error('Confirme uma edição por vez.');
      const item = items[0];
      const normalize = (text: string) => text.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const target = aiTargets.find(x => x.type === item.type && x.id === item.targetId && normalize(x.name).includes(normalize(item.name)));
      if (!target) throw new Error('Registro não encontrado. Atualize a prévia.');
      if (item.type === 'habit') {
        const old = habits.find(x => x.id === target.id)!;
        const updated = { ...old, name: item.newName ?? old.name, category: item.category ?? old.category, time: item.time ?? old.time, days: item.days ?? old.days, reminderEnabled: item.reminder ?? old.reminderEnabled };
        if (updated.reminderEnabled && !updated.time) throw new Error('Informe um horário para ativar o lembrete.');
        setHabits(list => list.map(x => x.id === target.id ? updated : x));
      }
      if (item.type === 'event') setTasks(list => list.map(x => x.id === target.id ? { ...x, title: item.newName ?? x.title, date: item.date ?? x.date, time: item.time ?? x.time, category: item.category ?? x.category } : x));
      if (item.type === 'finance') setFinance(list => list.map(x => x.id === target.id ? { ...x, description: item.newName ?? x.description, date: item.date ?? x.date, category: item.category ?? x.category, amount: item.amount ?? x.amount, type: item.direction ?? x.type } : x));
      if (item.type === 'goal') setGoals(list => list.map(x => x.id === target.id ? { ...x, title: item.newName ?? x.title, desc: item.description ?? x.desc, due: item.date ?? x.due, category: item.category ?? x.category } : x));
      if (item.type === 'workout') {
        const old = workouts.find(x => x.id === target.id);
        if (!old) throw new Error('Treino não encontrado.');
        const updated = item.exerciseChange ? applyExerciseChange(old, item.exerciseChange) : old;
        setWorkouts(list => list.map(x => x.id === target.id ? { ...updated, name: item.newName ?? updated.name, day: item.day ?? updated.day } : x));
      }
      if (item.type === 'meal') setMeals(list => list.map(x => x.id === target.id ? { ...x, food: item.newName ?? x.food, date: item.date ?? x.date, meal: item.meal ?? x.meal, calories: item.calories ?? x.calories, protein: item.protein ?? x.protein, carbs: item.carbs ?? x.carbs, fat: item.fat ?? x.fat } : x));
      if (item.type === 'water') setWater(list => list.map(x => x.id === target.id ? { ...x, date: item.date ?? x.date, amount: item.amount ?? x.amount } : x));
      if (item.type === 'note') {
        const notes: unknown = JSON.parse(localStorage.getItem('azyrus-notes-v1') || '[]');
        if (!Array.isArray(notes) || !notes.some(note => note?.id === target.id && note?.title === target.name && (item.expectedUpdatedAt === undefined || note.updatedAt === item.expectedUpdatedAt))) throw new Error('A nota mudou. Atualize a prévia.');
        localStorage.setItem('azyrus-notes-v1', JSON.stringify(notes.map(note => note?.id === target.id ? { ...note, title: item.newName ?? note.title, content: item.description ?? note.content, updatedAt: new Date().toISOString() } : note)));
        window.dispatchEvent(new Event('azyrus-notes-changed'));
      }
      say('Registro atualizado.');
      return;
    }
    const deletions = items.filter(item => item.action === 'delete');
    if (deletions.length) {
      if (items.length !== 1) throw new Error('Confirme uma exclusão por vez.');
      const item = deletions[0];
      const normalize = (text: string) => text.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const target = aiTargets.find(x => x.type === item.type && x.id === item.targetId && normalize(x.name).includes(normalize(item.name)));
      if (!target) throw new Error('Registro não encontrado. Atualize a prévia.');
      if (item.type === 'note') {
        const notes: unknown = JSON.parse(localStorage.getItem('azyrus-notes-v1') || '[]');
        if (!Array.isArray(notes) || !notes.some(note => note?.id === target.id && note?.title === target.name)) throw new Error('A nota mudou. Atualize a prévia.');
        localStorage.setItem('azyrus-notes-v1', JSON.stringify(notes.filter(note => note?.id !== target.id)));
        window.dispatchEvent(new Event('azyrus-notes-changed'));
      }
      if (item.type === 'habit') setHabits(list => list.filter(x => x.id !== target.id));
      if (item.type === 'event') setTasks(list => list.filter(x => x.id !== target.id));
      if (item.type === 'finance') setFinance(list => list.filter(x => x.id !== target.id));
      if (item.type === 'goal') setGoals(list => list.filter(x => x.id !== target.id));
      if (item.type === 'workout') setWorkouts(list => list.filter(x => x.id !== target.id));
      if (item.type === 'meal') setMeals(list => list.filter(x => x.id !== target.id));
      if (item.type === 'water') setWater(list => list.filter(x => x.id !== target.id));
      say('Registro excluído.');
      return;
    }
    const noteItems = items.filter(item => item.type === 'note');
    if (noteItems.length) {
      const raw = localStorage.getItem('azyrus-notes-v1');
      const notes: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(notes)) throw new Error('Não foi possível ler as notas existentes.');
      const now = new Date().toISOString();
      const added = noteItems.map(item => ({ id: uid(), title: item.name.trim(), content: item.description!, createdAt: now, updatedAt: now }));
      localStorage.setItem('azyrus-notes-v1', JSON.stringify([...added, ...notes]));
      window.dispatchEvent(new Event('azyrus-notes-changed'));
    }
    const habitsToAdd: Habit[] = [], tasksToAdd: Task[] = [], financeToAdd: FinanceTransaction[] = [], goalsToAdd: Goal[] = [], workoutsToAdd: Workout[] = [];
    for (const item of items) {
      if (item.type === 'habit') habitsToAdd.push({ id: uid(), name: item.name.trim(), category: item.category || 'Pessoal', days: item.days!, time: item.time || '', reminderEnabled: item.reminder, done: [], created: today() });
      if (item.type === 'event') tasksToAdd.push({ id: uid(), title: item.name.trim(), date: item.date!, time: item.time || '', priority: 1, category: item.category || 'Pessoal', done: false });
      if (item.type === 'finance') financeToAdd.push({ id: uid(), date: item.date!, type: item.direction!, description: item.name.trim(), category: item.category || 'Outro', amount: item.amount! });
      if (item.type === 'workout') workoutsToAdd.push({ id: uid(), name: item.name.trim(), date: today(), day: item.day!, duration: 0, notes: '', completed: false, exercises: item.exercises!.map(makeExercise) });
      if (item.type === 'goal') goalsToAdd.push({ id: uid(), title: item.name.trim(), desc: item.description || '', due: item.date || '', category: item.category || 'Pessoal', status: 'ativa', tracked: false, unit: '', start: 0, current: 0, target: 100, pct: 0 });
    }
    if (habitsToAdd.length) setHabits(list => [...list, ...habitsToAdd]);
    if (tasksToAdd.length) setTasks(list => [...list, ...tasksToAdd]);
    if (financeToAdd.length) setFinance(list => [...list, ...financeToAdd]);
    if (workoutsToAdd.length) setWorkouts(list => [...list, ...workoutsToAdd]);
    if (goalsToAdd.length) setGoals(list => [...list, ...goalsToAdd]);
    const mealsToAdd: MealEntry[] = items.filter(item => item.type === 'meal').map(item => ({ id: uid(), food: item.name.trim(), date: item.date!, meal: item.meal!, calories: item.calories!, protein: item.protein!, carbs: item.carbs!, fat: item.fat! }));
    if (mealsToAdd.length) setMeals(list => [...list, ...mealsToAdd]);
    const waterToAdd: WaterEntry[] = items.filter(item => item.type === 'water').map(item => ({ id: uid(), date: item.date!, amount: item.amount! }));
    if (waterToAdd.length) setWater(list => [...list, ...waterToAdd]);
    say('Registros adicionados.');
  };

  const aiTargets: AITarget[] = [
    ...habits.map(x => ({ type: 'habit' as const, id: x.id, name: x.name, detail: x.time })),
    ...tasks.map(x => ({ type: 'event' as const, id: x.id, name: x.title, detail: `${x.date} ${x.time}` })),
    ...finance.map(x => ({ type: 'finance' as const, id: x.id, name: x.description, detail: `${x.date} · ${x.amount}` })),
    ...goals.map(x => ({ type: 'goal' as const, id: x.id, name: x.title, detail: x.due })),
    ...workouts.map(x => ({ type: 'workout' as const, id: x.id, name: x.name, detail: `Dia ${x.day ?? '?'}` })),
    ...meals.map(x => ({ type: 'meal' as const, id: x.id, name: x.food, detail: `${x.date} · ${x.meal}` })),
    ...water.map(x => ({ type: 'water' as const, id: x.id, name: 'Água', detail: `${x.date} · ${x.amount} ml` })),
    ...((): AITarget[] => { try { const notes: unknown = JSON.parse(localStorage.getItem('azyrus-notes-v1') || '[]'); return Array.isArray(notes) ? notes.filter(x => typeof x?.id === 'string' && typeof x?.title === 'string').map(x => ({ type: 'note' as const, id: x.id, name: x.title, detail: x.updatedAt || '' })) : []; } catch { return []; } })()
  ];

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

  const storageErrors = [e1, e2, e3, e4, e5, e6, e7];
  if (storageErrors.includes('read')) return <div className="h-dvh grid place-items-center px-6 text-center"><div><p>Não foi possível ler os dados deste aparelho. Nenhum dado foi substituído.</p><Btn className="mt-4" onClick={() => window.location.reload()}>Tentar novamente</Btn></div></div>;
  if (!(r1 && r2 && r3 && r4 && r5 && r6 && r7)) {
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
      <main key={tab + ':' + morePage} className="app-main min-h-0 flex-1 overflow-y-auto">
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
      {showAssistant && <Assistant onClose={() => setShowAssistant(false)} onConfirm={confirmAI} targets={aiTargets} />}
      <nav
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
