import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Exercise, ExerciseSet, Setter, Workout } from '../types';
import { Btn, Card, Empty, Field, Head, Sel, Sheet } from '../ui';
import { today, uid } from '../utils';

type P = {
  workouts: Workout[];
  setWorkouts: Setter<Workout[]>;
  say: (m: string) => void;
};

const blank = (): Workout => ({
  id: '',
  name: 'Treino',
  date: today(),
  duration: 0,
  notes: '',
  exercises: [],
  completed: false,
});

const blankExercise = (): Exercise => ({
  id: uid(),
  name: '',
  sets: [
    {
      id: uid(),
      reps: 10,
      weight: 0,
    },
  ],
  rest: 60,
  notes: '',
});

export default function Workouts({ workouts, setWorkouts, say }: P) {
  const [form, setForm] = useState<Workout | null>(null);
  const [selected, setSelected] = useState<Workout | null>(null);

  const save = () => {
    if (!form || !form.name.trim()) return;

    const w = {
      ...form,
      name: form.name.trim(),
      id: form.id || uid(),
      exercises: form.exercises.filter(e => e.name.trim()),
    };

    setWorkouts(l =>
      form.id
        ? l.map(x => (x.id === form.id ? w : x))
        : [...l, w]
    );

    say('Treino salvo');
    setForm(null);
  };

  const remove = (w: Workout) => {
    if (confirm(`Excluir "${w.name}"?`)) {
      setWorkouts(l => l.filter(x => x.id !== w.id));
      setSelected(null);
      setForm(null);
    }
  };

  const addExercise = () =>
    form &&
    setForm({
      ...form,
      exercises: [...form.exercises, blankExercise()],
    });

  const updateExercise = (
    id: string,
    p: Partial<Exercise>
  ) =>
    form &&
    setForm({
      ...form,
      exercises: form.exercises.map(e =>
        e.id === id ? { ...e, ...p } : e
      ),
    });

  const removeExercise = (id: string) =>
    form &&
    setForm({
      ...form,
      exercises: form.exercises.filter(e => e.id !== id),
    });

  const updateSet = (
    e: Exercise,
    sid: string,
    p: Partial<ExerciseSet>
  ) =>
    updateExercise(e.id, {
      sets: e.sets.map(s =>
        s.id === sid ? { ...s, ...p } : s
      ),
    });

  const removeSet = (e: Exercise, sid: string) =>
    updateExercise(e.id, {
      sets: e.sets.filter(s => s.id !== sid),
    });

  const changeSetCount = (e: Exercise, count: number) => {
    const newSets = Array.from(
      { length: count },
      (_, i) =>
        e.sets[i] ?? {
          id: uid(),
          reps: 10,
          weight: 0,
        }
    );

    updateExercise(e.id, {
      sets: newSets,
    });
  };

  const dayNames = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];

  return (
    <>
      <Head
        title="Treinos"
        action={
          <Btn
            onClick={() => setForm(blank())}
            aria-label="Novo treino"
            className="!px-0 w-12"
          >
            <Plus size={22} />
          </Btn>
        }
      />

      {workouts.length === 0 && (
        <Empty
          text="Registre seu primeiro treino."
          action={
            <Btn onClick={() => setForm(blank())}>
              Novo treino
            </Btn>
          }
        />
      )}

      <div className="space-y-5">
        {[1, 2, 3, 4, 5, 6, 0].map(day => {
          const dayWorkouts = workouts.filter(w => {
            const workoutDay =
              w.day ??
              new Date(w.date + 'T12:00:00').getDay();

            return workoutDay === day;
          });

          return (
            <div key={day}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold">
                  {dayNames[day]}
                </p>

                <span className="text-xs text-mu">
                  {dayWorkouts.length} treino(s)
                </span>
              </div>

              {dayWorkouts.length === 0 ? (
                <Card className="!bg-bg">
                  <p className="text-sm text-mu">
                    Nenhum treino planejado.
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {dayWorkouts.map(w => (
                    <Card key={w.id}>
                      <button
                        onClick={() => setSelected(w)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">
                              {w.name}
                            </p>

                            <p className="text-sm text-mu">
                              {w.exercises.length} exercício(s)
                              {w.duration
                                ? ` · ${w.duration} min`
                                : ''}
                            </p>
                          </div>
                        </div>
                      </button>

                      <div className="flex gap-2 mt-3">
                        <Btn
                          variant="ghost"
                          className="flex-1"
                          onClick={() => setForm(w)}
                        >
                          Editar
                        </Btn>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selected && (
        <Sheet
          title={selected.name}
          onClose={() => setSelected(null)}
        >
          <div className="space-y-3">
            {selected.exercises.map(e => (
              <Card key={e.id} className="!bg-bg">
                <p className="font-medium">{e.name}</p>

                <p className="text-sm text-mu mb-2">
                  {e.sets.length} série(s) · descanso {e.rest}s
                </p>

                {e.sets.map((s, i) => (
                  <p key={s.id} className="text-sm">
                    {i + 1}. {s.reps} reps · {s.weight} kg
                  </p>
                ))}
              </Card>
            ))}
          </div>

          {selected.notes && (
            <p className="text-sm text-mu mt-3">
              {selected.notes}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 mt-5">
            <Btn
              variant="ghost"
              onClick={() => {
                setForm(selected);
                setSelected(null);
              }}
            >
              Editar
            </Btn>

            <Btn
              variant="danger"
              onClick={() => remove(selected)}
            >
              <Trash2 size={18} />
              Excluir
            </Btn>
          </div>
        </Sheet>
      )}

      {form && (
        <Sheet
          title={form.id ? 'Editar treino' : 'Novo treino'}
          onClose={() => setForm(null)}
        >
          <Field
            label="Nome do treino"
            value={form.name}
            onChange={e =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Sel
              label="Dia da semana"
              value={
                form.day ??
                new Date(
                  form.date + 'T12:00:00'
                ).getDay()
              }
              onChange={e =>
                setForm({
                  ...form,
                  day: Number(e.target.value),
                })
              }
            >
              <option value="1">Segunda-feira</option>
              <option value="2">Terça-feira</option>
              <option value="3">Quarta-feira</option>
              <option value="4">Quinta-feira</option>
              <option value="5">Sexta-feira</option>
              <option value="6">Sábado</option>
              <option value="0">Domingo</option>
            </Sel>

            <Field
              label="Duração (min)"
              type="number"
              min="0"
              value={form.duration || ''}
              onChange={e =>
                setForm({
                  ...form,
                  duration:
                    Number(e.target.value) || 0,
                })
              }
            />
          </div>

          <Field
            label="Observações"
            value={form.notes}
            onChange={e =>
              setForm({
                ...form,
                notes: e.target.value,
              })
            }
          />

          <div className="flex items-center justify-between mt-4 mb-2">
            <p className="font-medium">
              Exercícios
            </p>

            <Btn
              variant="ghost"
              onClick={addExercise}
            >
              <Plus size={18} />
              Adicionar
            </Btn>
          </div>

          <div className="space-y-4">
            {form.exercises.map((e, idx) => (
              <Card
                key={e.id}
                className="!bg-bg"
              >
                <div className="flex gap-2">
                  <Field
                    label={`Exercício ${idx + 1}`}
                    value={e.name}
                    onChange={x =>
                      updateExercise(e.id, {
                        name: x.target.value,
                      })
                    }
                  />

                  <button
                    aria-label="Excluir exercício"
                    className="mt-6 size-11 grid place-items-center text-mu"
                    onClick={() =>
                      removeExercise(e.id)
                    }
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <Sel
                  label="Descanso"
                  value={e.rest}
                  onChange={x =>
                    updateExercise(e.id, {
                      rest: Number(x.target.value),
                    })
                  }
                >
                  <option value="30">30s</option>
                  <option value="60">60s</option>
                  <option value="90">90s</option>
                  <option value="120">120s</option>
                  <option value="180">180s</option>
                </Sel>

                <Sel
                  label="Quantidade de séries"
                  value={e.sets.length}
                  onChange={x =>
                    changeSetCount(
                      e,
                      Number(x.target.value)
                    )
                  }
                >
                  <option value="1">1 série</option>
                  <option value="2">2 séries</option>
                  <option value="3">3 séries</option>
                  <option value="4">4 séries</option>
                  <option value="5">5 séries</option>
                  <option value="6">6 séries</option>
                  <option value="7">7 séries</option>
                  <option value="8">8 séries</option>
                  <option value="9">9 séries</option>
                  <option value="10">10 séries</option>
                </Sel>

                <p className="text-sm text-mu mb-2 mt-3">
                  Séries
                </p>

                <div className="space-y-2">
                  {e.sets.map((s, i) => (
                    <div
                      key={s.id}
                      className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end"
                    >
                      <Field
                        label={`S${i + 1} reps`}
                        type="number"
                        min="0"
                        value={s.reps}
                        onChange={x =>
                          updateSet(
                            e,
                            s.id,
                            {
                              reps:
                                Number(
                                  x.target.value
                                ) || 0,
                            }
                          )
                        }
                      />

                      <Field
                        label="Peso kg"
                        type="number"
                        min="0"
                        step="0.5"
                        value={s.weight}
                        onChange={x =>
                          updateSet(
                            e,
                            s.id,
                            {
                              weight:
                                Number(
                                  x.target.value
                                ) || 0,
                            }
                          )
                        }
                      />

                      <button
                        aria-label="Excluir série"
                        className="size-11 grid place-items-center text-mu mb-3"
                        onClick={() =>
                          removeSet(e, s.id)
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <Btn
            className="w-full mt-4"
            onClick={save}
            disabled={!form.name.trim()}
          >
            Salvar treino
          </Btn>
        </Sheet>
      )}
    </>
  );
}