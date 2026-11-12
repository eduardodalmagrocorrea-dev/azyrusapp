
import { useRef } from 'react';
import {
  Bell,
  Download,
  History,
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
  Task,
  WaterEntry,
  Workout
} from '../types';
import { Btn, Card, Field, Head, cx } from '../ui';
import { today } from '../utils';

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
};

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
  onEnableNotifications
}: P) {
  const file = useRef<HTMLInputElement>(null);

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
    </>
  );
}
