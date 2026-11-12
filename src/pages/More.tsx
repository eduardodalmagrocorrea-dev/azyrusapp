
import { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Bell,
  Download,
  Dumbbell,
  Flame,
  History,
  Home,
  ListChecks,
  Settings2,
  Target,
  Trash2,
  Upload
} from 'lucide-react';
import type {
  FinanceTransaction,
  Goal,
  Habit,
  MealEntry,
  Setter,
  Settings,
  Tab,
  Task,
  WaterEntry,
  Workout
} from '../types';
import { Btn, Card, Field, Head, Sheet, cx } from '../ui';
import { today } from '../utils';

export type NavId = Exclude<Tab, 'more'>;

export type NavigationLayout = {
  bar: NavId[];
  settings: NavId[];
};

type Data = {
  habits: Habit[];
  tasks: Task[];
  goals: Goal[];
  workouts: Workout[];
  meals: MealEntry[];
  water: WaterEntry[];
  finance: FinanceTransaction[];
};

type P = {
  st: Settings;
  setSt: Setter<Settings>;
  data: Data;
  setHabits: Setter<Habit[]>;
  setTasks: Setter<Task[]>;
  setGoals: Setter<Goal[]>;
  setWorkouts: Setter<Workout[]>;
  setMeals: Setter<MealEntry[]>;
  setWater: Setter<WaterEntry[]>;
  setFinance: Setter<FinanceTransaction[]>;
  setPage: (
    p: 'more' | 'workouts' | 'diet' | 'finance' | 'history'
  ) => void;
  say: (m: string) => void;
  onEnableNotifications: () => void;
  navigation: NavigationLayout;
  setNavigation: Setter<NavigationLayout>;
  onOpenTab: (id: NavId) => void;
};

const NAV_ITEMS: {
  id: NavId;
  label: string;
  description: string;
  icon: typeof Home;
}[] = [
  {
    id: 'home',
    label: 'Início',
    description: 'Visão geral do aplicativo',
    icon: Home
  },
  {
    id: 'habits',
    label: 'Hábitos',
    description: 'Seus hábitos diários',
    icon: Flame
  },
  {
    id: 'workouts',
    label: 'Treinos',
    description: 'Planejamento de exercícios',
    icon: Dumbbell
  },
  {
    id: 'tasks',
    label: 'Calendário',
    description: 'Tarefas e anotações',
    icon: ListChecks
  },
  {
    id: 'goals',
    label: 'Metas',
    description: 'Seus objetivos',
    icon: Target
  }
];

export default function More({
  st,
  setSt,
  data,
  setHabits,
  setTasks,
  setGoals,
  setWorkouts,
  setMeals,
  setWater,
  setFinance,
  setPage,
  say,
  onEnableNotifications,
  navigation,
  setNavigation,
  onOpenTab
}: P) {
  const file = useRef<HTMLInputElement>(null);
  const [editingNavigation, setEditingNavigation] =
    useState(false);

  const moveTo = (
    id: NavId,
    destination: 'bar' | 'settings'
  ) => {
    setNavigation(current => ({
      bar:
        destination === 'bar'
          ? [...current.bar.filter(x => x !== id), id]
          : current.bar.filter(x => x !== id),
      settings:
        destination === 'settings'
          ? [...current.settings.filter(x => x !== id), id]
          : current.settings.filter(x => x !== id)
    }));
  };

  const reorder = (
    id: NavId,
    location: 'bar' | 'settings',
    direction: -1 | 1
  ) => {
    setNavigation(current => {
      const items = [...current[location]];
      const index = items.indexOf(id);
      const next = index + direction;

      if (
        index < 0 ||
        next < 0 ||
        next >= items.length
      ) {
        return current;
      }

      [items[index], items[next]] = [
        items[next],
        items[index]
      ];

      return {
        ...current,
        [location]: items
      };
    });
  };

  const renderNavigationItem = (
    id: NavId,
    location: 'bar' | 'settings',
    index: number,
    total: number
  ) => {
    const item = NAV_ITEMS.find(x => x.id === id);
    if (!item) return null;

    const Icon = item.icon;
    const destination =
      location === 'bar' ? 'settings' : 'bar';

    return (
      <div
        key={id}
        className="flex items-center gap-2 rounded-xl border border-ln p-2 mb-2"
      >
        <span className="size-9 shrink-0 rounded-lg bg-bg grid place-items-center">
          <Icon size={18} />
        </span>

        <span className="flex-1 min-w-0 text-sm font-medium truncate">
          {item.label}
        </span>

        <button
          type="button"
          aria-label={`Mover ${item.label} para cima`}
          title="Mover para cima"
          disabled={index === 0}
          onClick={() => reorder(id, location, -1)}
          className="size-9 shrink-0 rounded-lg border border-ln grid place-items-center disabled:opacity-25"
        >
          <ArrowUp size={17} />
        </button>

        <button
          type="button"
          aria-label={`Mover ${item.label} para baixo`}
          title="Mover para baixo"
          disabled={index === total - 1}
          onClick={() => reorder(id, location, 1)}
          className="size-9 shrink-0 rounded-lg border border-ln grid place-items-center disabled:opacity-25"
        >
          <ArrowDown size={17} />
        </button>

        <button
          type="button"
          aria-label={`Mover ${item.label} para ${
            destination === 'bar'
              ? 'a barra inferior'
              : 'Ajustes'
          }`}
          title={
            destination === 'bar'
              ? 'Colocar na barra inferior'
              : 'Colocar em Ajustes'
          }
          onClick={() => moveTo(id, destination)}
          className="flex flex-col items-center justify-center gap-0.5 min-w-14 h-10 px-1 rounded-lg bg-bg text-ac"
        >
          <ArrowLeftRight size={15} />
          <span className="text-[10px]">
            {destination === 'bar' ? 'Barra' : 'Ajustes'}
          </span>
        </button>
      </div>
    );
  };

  const exportData = async () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            app: 'AZYRUS',
            version: 2,
            exportedAt: new Date().toISOString(),
            settings: st,
            data
          },
          null,
          2
        )
      ],
      { type: 'application/json' }
    );

    const f = new File(
      [blob],
      `azyrus-${today()}.json`,
      { type: 'application/json' }
    );

    try {
      if (navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f] });
        say('Backup exportado');
        return;
      }
    } catch {}

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = f.name;
    a.click();

    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    say('Backup exportado');
  };

  const importData = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const f = e.target.files?.[0];
    e.target.value = '';

    if (!f) return;

    try {
      const j = JSON.parse(await f.text());

      if (
        j.app !== 'AZYRUS' ||
        !Array.isArray(j.data?.habits) ||
        !Array.isArray(j.data?.tasks) ||
        !Array.isArray(j.data?.goals)
      ) {
        throw new Error();
      }

      if (
        !confirm(
          'Importar vai substituir todos os dados atuais. Continuar?'
        )
      ) {
        return;
      }

      setHabits(j.data.habits);
      setTasks(j.data.tasks);
      setGoals(j.data.goals);

      setWorkouts(
        Array.isArray(j.data.workouts)
          ? j.data.workouts
          : []
      );

      setMeals(
        Array.isArray(j.data.meals)
          ? j.data.meals
          : []
      );

      setWater(
        Array.isArray(j.data.water)
          ? j.data.water
          : []
      );

      setFinance(
        Array.isArray(j.data.finance)
          ? j.data.finance
          : []
      );

      if (j.settings) {
        setSt(s => ({
          ...s,
          name: String(j.settings.name ?? s.name),
          theme:
            j.settings.theme === 'light'
              ? 'light'
              : 'dark',
          onboarded: true
        }));
      }

      say('Dados importados');
    } catch {
      alert(
        'Arquivo inválido. Use um backup exportado pelo AZYRUS.'
      );
    }
  };

  const clear = () => {
    if (
      !confirm(
        'Apagar TODOS os dados do AZYRUS? Isso não pode ser desfeito.'
      )
    ) {
      return;
    }

    setHabits([]);
    setTasks([]);
    setGoals([]);
    setWorkouts([]);
    setMeals([]);
    setWater([]);
    setFinance([]);

    say('Dados apagados');
  };

  return (
    <>
      <Head title="Ajustes" />

      <div className="space-y-3">
        {navigation.settings.length > 0 && (
          <div className="space-y-3">
            {navigation.settings.map(id => {
              const item = NAV_ITEMS.find(
                x => x.id === id
              );

              if (!item) return null;

              const Icon = item.icon;

              return (
                <Card
                  key={id}
                  onClick={() => onOpenTab(id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="size-11 shrink-0 rounded-xl bg-bg grid place-items-center">
                      <Icon size={21} />
                    </span>

                    <div>
                      <p className="font-medium">
                        {item.label}
                      </p>
                      <p className="text-sm text-mu">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Card
          onClick={() => setEditingNavigation(true)}
        >
          <div className="flex items-center gap-3">
            <span className="size-11 rounded-xl bg-bg grid place-items-center">
              <Settings2 size={21} />
            </span>

            <div>
              <p className="font-medium">
                Personalizar navegação
              </p>
              <p className="text-sm text-mu">
                Organizar ícones e mover páginas
              </p>
            </div>
          </div>
        </Card>

        <Card onClick={() => setPage('history')}>
          <div className="flex items-center gap-3">
            <span className="size-11 rounded-xl bg-bg grid place-items-center">
              <History size={21} />
            </span>

            <div>
              <p className="font-medium">
                Histórico
              </p>
              <p className="text-sm text-mu">
                Resumo das suas atividades
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <p className="font-medium mb-3">
            Configurações
          </p>

          <Field
            label="Seu nome"
            value={st.name}
            onChange={e =>
              setSt({
                ...st,
                name: e.target.value
              })
            }
          />

          <p className="text-sm text-mu mb-2">
            Tema
          </p>

          <div className="grid grid-cols-2 gap-2">
            {(['dark', 'light'] as const).map(t => (
              <button
                key={t}
                aria-pressed={st.theme === t}
                onClick={() =>
                  setSt({
                    ...st,
                    theme: t
                  })
                }
                className={cx(
                  'h-11 rounded-xl text-sm',
                  st.theme === t
                    ? 'bg-ac text-on font-medium'
                    : 'border border-ln text-mu'
                )}
              >
                {t === 'dark' ? 'Escuro' : 'Claro'}
              </button>
            ))}
          </div>
        </Card>

        <Card className="space-y-3">
          <p className="font-medium">
            Seus dados
          </p>

          <p className="text-sm text-mu">
            Os dados ficam no armazenamento local
            deste navegador/app. Faça backups regularmente.
          </p>

          <Btn
            variant="ghost"
            className="w-full"
            onClick={exportData}
          >
            <Download size={18} />
            Exportar dados
          </Btn>

          <Btn
            variant="ghost"
            className="w-full"
            onClick={() => file.current?.click()}
          >
            <Upload size={18} />
            Importar dados
          </Btn>

          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={importData}
          />

          <Btn
            variant="danger"
            className="w-full"
            onClick={clear}
          >
            <Trash2 size={18} />
            Limpar dados
          </Btn>
        </Card>

        <Card className="space-y-3">
          <p className="font-medium">
            Notificações
          </p>

          <p className="text-sm text-mu">
            Receba lembretes dos seus hábitos
            nos horários programados.
          </p>

          <Btn
            variant="ghost"
            className="w-full"
            onClick={onEnableNotifications}
          >
            <Bell size={18} />
            Ativar notificações
          </Btn>
        </Card>
      </div>

      {editingNavigation && (
        <Sheet
          title="Personalizar navegação"
          onClose={() => setEditingNavigation(false)}
        >
          <p className="text-sm text-mu mb-5">
            Use as setas para mudar a ordem.
            Use o botão Barra ou Ajustes para
            escolher onde cada página aparece.
          </p>

          <p className="font-medium mb-3">
            Barra inferior
          </p>

          {navigation.bar.length === 0 && (
            <p className="text-sm text-mu mb-3">
              Nenhuma página nesta área.
            </p>
          )}

          {navigation.bar.map((id, index) =>
            renderNavigationItem(
              id,
              'bar',
              index,
              navigation.bar.length
            )
          )}

          <p className="font-medium mt-6 mb-3">
            Dentro de Ajustes
          </p>

          {navigation.settings.length === 0 && (
            <p className="text-sm text-mu mb-3">
              Nenhuma página movida para Ajustes.
            </p>
          )}

          {navigation.settings.map((id, index) =>
            renderNavigationItem(
              id,
              'settings',
              index,
              navigation.settings.length
            )
          )}

          <p className="text-xs text-mu mt-5 mb-4">
            Ajustes permanece na barra inferior
            para que você sempre possa alterar
            a navegação.
          </p>

          <Btn
            className="w-full"
            onClick={() => setEditingNavigation(false)}
          >
            Concluir
          </Btn>
        </Sheet>
      )}
    </>
  );
}
