
import { useState } from 'react';
import {
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Pencil,
  Play,
  Plus,
  Square,
  Trash2,
} from 'lucide-react';
import type { Exercise, ExerciseSet, Setter, Workout } from '../types';
import { Btn, Card, Empty, Field, Head, Sel, Sheet } from '../ui';
import { today, uid } from '../utils';

type P = {
  workouts: Workout[];
  setWorkouts: Setter<Workout[]>;
  say: (m: string) => void;
};

const days = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const order = [1, 2, 3, 4, 5, 6, 0];

const blank = (): Workout => ({
  id: '',
  name: 'Treino',
  date: today(),
  duration: 0,
  notes: '',
  exercises: [],
  completed: false,
  day: new Date().getDay(),
});

const blankExercise = (): Exercise => ({
  id: uid(),
  name: '',
  sets: [{ id: uid(), reps: 0, weight: 0 }],
  rest: 60,
  notes: '',
});

export default function Workouts({ workouts, setWorkouts, say }: P) {
  const [form, setForm] = useState<Workout | null>(null);
  const [viewing, setViewing] = useState<Workout | null>(null);
  const [day, setDay] = useState(new Date().getDay());
  const [doneExercises, setDoneExercises] = useState<string[]>([]);
  const [doneSets, setDoneSets] = useState<string[]>([]);
  const [exerciseIndex, setExerciseIndex] = useState(0);

  const save = () => {
    if (!form || !form.name.trim()) return;

    const workout: Workout = {
      ...form,
      name: form.name.trim(),
      id: form.id || uid(),
      exercises: form.exercises
        .filter((exercise) => exercise.name.trim())
        .map((exercise) => ({
          ...exercise,
          sets: exercise.sets.map((set) => ({
            ...set,
            reps: Number(set.reps) || 0,
            weight: Number(set.weight) || 0,
          })),
        })),
    };

    setWorkouts((list) =>
      form.id
        ? list.map((item) => (item.id === form.id ? workout : item))
        : [...list, workout],
    );

    setDay(workout.day ?? day);
    setForm(null);
    say('Treino salvo');
  };

  const edit = (workout: Workout) => {
    setForm({
      ...workout,
      exercises: workout.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({ ...set })),
      })),
    });
    setViewing(null);
  };

  const remove = (workout: Workout) => {
    if (!confirm(`Excluir "${workout.name}"?`)) return;

    setWorkouts((list) => list.filter((item) => item.id !== workout.id));
    setViewing(null);
    setForm(null);
    say('Treino excluído');
  };

  const addExercise = () => {
    if (!form) return;

    setForm({
      ...form,
      exercises: [...form.exercises, blankExercise()],
    });
  };

  const updateExercise = (id: string, properties: Partial<Exercise>) => {
    if (!form) return;

    setForm({
      ...form,
      exercises: form.exercises.map((exercise) =>
        exercise.id === id ? { ...exercise, ...properties } : exercise,
      ),
    });
  };

  const updateSet = (
    exercise: Exercise,
    id: string,
    properties: Partial<ExerciseSet>,
  ) => {
    updateExercise(exercise.id, {
      sets: exercise.sets.map((set) =>
        set.id === id ? { ...set, ...properties } : set,
      ),
    });
  };

  const changeSetCount = (exercise: Exercise, count: number) => {
    updateExercise(exercise.id, {
      sets: Array.from(
        { length: count },
        (_, index) =>
          exercise.sets[index] ?? {
            id: uid(),
            reps: 0,
            weight: 0,
          },
      ),
    });
  };

  const start = (workout: Workout) => {
    setViewing(workout);
    setDoneExercises([]);
    setDoneSets([]);
    setExerciseIndex(0);
  };

  const toggleExercise = (id: string) => {
    setDoneExercises((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  };

  const toggleSet = (id: string) => {
    setDoneSets((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  };

  const finish = () => {
    if (!viewing) return;

    setWorkouts((list) =>
      list.map((workout) =>
        workout.id === viewing.id
          ? { ...workout, completed: true }
          : workout,
      ),
    );

    setViewing(null);
    say('Treino concluído');
  };

  const currentDay = workouts.filter(
    (workout) =>
      (workout.day ??
        new Date(`${workout.date}T12:00:00`).getDay()) === day,
  );

  return (
    <>
      <Head
        title="Treinos"
        action={
          <Btn
            onClick={() => setForm({ ...blank(), day })}
            className="!px-0 w-12"
          >
            <Plus size={22} />
          </Btn>
        }
      />

      <div className="grid grid-cols-7 gap-1.5 mb-5">
        {order.map((weekday) => (
          <button
            key={weekday}
            onClick={() => setDay(weekday)}
            className={`h-11 rounded-xl text-xs border ${
              day === weekday
                ? 'bg-ac text-on border-ac font-semibold'
                : 'border-ln text-mu'
            }`}
          >
            {days[weekday].slice(0, 3)}
          </button>
        ))}
      </div>

      <p className="font-semibold mb-3">{days[day]}</p>

      {currentDay.length === 0 ? (
        <Empty
          text="Nenhum treino planejado para este dia."
          action={
            <Btn onClick={() => setForm({ ...blank(), day })}>
              Adicionar treino
            </Btn>
          }
        />
      ) : (
        <div className="space-y-3">
          {currentDay.map((workout) => (
            <Card key={workout.id}>
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-ac/10 grid place-items-center">
                  <Dumbbell size={21} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{workout.name}</p>
                  <p className="text-sm text-mu">
                    {workout.exercises.length} exercícios
                    {workout.duration ? ` · ${workout.duration} min` : ''}
                  </p>
                  {workout.completed && (
                    <p className="text-xs text-green-400 mt-1">
                      Treino concluído
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <Btn onClick={() => start(workout)}>
                  <Play size={16} /> Visualizar
                </Btn>
                <Btn variant="ghost" onClick={() => edit(workout)}>
                  <Pencil size={16} /> Editar
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {viewing && (
        <Sheet
          title={viewing.name}
          onClose={() => setViewing(null)}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-mu">
                Marque cada exercício ou série concluída.
              </p>
              <span className="text-xs text-mu whitespace-nowrap">
                {doneExercises.length}/{viewing.exercises.length}
              </span>
            </div>

            {viewing.exercises.map((exercise, index) => {
              const exerciseDone = doneExercises.includes(exercise.id);

              return (
                <div
                  key={exercise.id}
                  className="overflow-hidden rounded-2xl border border-ln bg-[#101114]"
                >
                  <button
                    onClick={() => toggleExercise(exercise.id)}
                    className="w-full flex items-center gap-3 text-left p-4"
                  >
                    {exerciseDone ? (
                      <CheckSquare
                        size={22}
                        className="shrink-0 text-ac"
                      />
                    ) : (
                      <Square
                        size={22}
                        className="shrink-0 text-mu"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-semibold text-base ${
                          exerciseDone ? 'line-through text-mu' : ''
                        }`}
                      >
                        {exercise.name}
                      </p>

                      <p className="text-xs text-mu mt-1 flex items-center gap-1">
                        <Clock3 size={13} />
                        Descanso: {exercise.rest}s
                      </p>
                    </div>

                    <span className="text-xs text-mu">
                      {index + 1}/{viewing.exercises.length}
                    </span>
                  </button>

                  <div className="grid grid-cols-[1fr_1fr_1fr] px-4 py-2 bg-[#1d1f23] text-[10px] font-semibold tracking-widest text-gray-400">
                    <span>SÉRIE</span>
                    <span className="text-center">KG</span>
                    <span className="text-right">REPS</span>
                  </div>

                  {exercise.sets.map((set, setIndex) => {
                    const key = `${exercise.id}:${set.id}`;
                    const checked = doneSets.includes(key);

                    return (
                      <button
                        key={set.id}
                        onClick={() => toggleSet(key)}
                        className={`w-full grid grid-cols-[1fr_1fr_1fr] items-center px-4 py-3 text-sm text-left border-t border-[#292b30] ${
                          checked
                            ? 'bg-[#203128] text-green-300'
                            : setIndex % 2 === 0
                              ? 'bg-[#151619]'
                              : 'bg-[#191a1e]'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {checked ? (
                            <CheckCircle2 size={17} />
                          ) : (
                            <span className="size-[17px] rounded-full border border-gray-600" />
                          )}
                          {setIndex + 1}
                        </span>

                        <span className="text-center font-semibold">
                          {set.weight} kg
                        </span>

                        <span className="text-right font-semibold">
                          {set.reps}
                        </span>
                      </button>
                    );
                  })}

                  {exercise.notes && (
                    <p className="px-4 py-3 text-xs text-mu">
                      {exercise.notes}
                    </p>
                  )}
                </div>
              );
            })}

            {viewing.notes && (
              <p className="text-sm text-mu">{viewing.notes}</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Btn
                variant="ghost"
                disabled={exerciseIndex === 0}
                onClick={() =>
                  setExerciseIndex((index) => Math.max(0, index - 1))
                }
              >
                <ChevronLeft size={17} /> Anterior
              </Btn>

              <Btn
                disabled={exerciseIndex >= viewing.exercises.length - 1}
                onClick={() =>
                  setExerciseIndex((index) =>
                    Math.min(viewing.exercises.length - 1, index + 1),
                  )
                }
              >
                Próximo <ChevronRight size={17} />
              </Btn>
            </div>

            <Btn className="w-full" onClick={finish}>
              <Check size={17} /> Finalizar treino
            </Btn>

            <Btn
              variant="ghost"
              className="w-full"
              onClick={() => edit(viewing)}
            >
              <Pencil size={16} /> Editar treino
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
            onChange={(event) =>
              setForm({ ...form, name: event.target.value })
            }
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Sel
              label="Dia da semana"
              value={
                form.day ??
                new Date(`${form.date}T12:00:00`).getDay()
              }
              onChange={(event) =>
                setForm({ ...form, day: Number(event.target.value) })
              }
            >
              {order.map((weekday) => (
                <option key={weekday} value={weekday}>
                  {days[weekday]}
                </option>
              ))}
            </Sel>

            <Field
              label="Duração (min)"
              type="number"
              min="0"
              value={form.duration || ''}
              onChange={(event) =>
                setForm({
                  ...form,
                  duration: Number(event.target.value) || 0,
                })
              }
            />
          </div>

          <Field
            label="Observações do treino"
            value={form.notes}
            onChange={(event) =>
              setForm({ ...form, notes: event.target.value })
            }
          />

          <div className="flex items-center justify-between mt-4 mb-2">
            <p className="font-medium">Exercícios</p>
            <Btn variant="ghost" onClick={addExercise}>
              <Plus size={18} /> Adicionar
            </Btn>
          </div>

          <div className="space-y-4">
            {form.exercises.map((exercise, index) => (
              <Card key={exercise.id} className="!bg-bg">
                <div className="flex gap-2">
                  <Field
                    label={`Exercício ${index + 1}`}
                    value={exercise.name}
                    onChange={(event) =>
                      updateExercise(exercise.id, {
                        name: event.target.value,
                      })
                    }
                  />

                  <button
                    className="mt-6 size-11 grid place-items-center text-mu"
                    aria-label="Excluir exercício"
                    onClick={() =>
                      setForm({
                        ...form,
                        exercises: form.exercises.filter(
                          (item) => item.id !== exercise.id,
                        ),
                      })
                    }
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Sel
                    label="Descanso"
                    value={exercise.rest}
                    onChange={(event) =>
                      updateExercise(exercise.id, {
                        rest: Number(event.target.value),
                      })
                    }
                  >
                    {[30, 60, 90, 120, 180].map((seconds) => (
                      <option key={seconds} value={seconds}>
                        {seconds}s
                      </option>
                    ))}
                  </Sel>

                  <Sel
                    label="Quantidade de séries"
                    value={exercise.sets.length}
                    onChange={(event) =>
                      changeSetCount(
                        exercise,
                        Number(event.target.value),
                      )
                    }
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                      <option key={count} value={count}>
                        {count} séries
                      </option>
                    ))}
                  </Sel>
                </div>

                <Field
                  label="Observações do exercício"
                  value={exercise.notes}
                  onChange={(event) =>
                    updateExercise(exercise.id, {
                      notes: event.target.value,
                    })
                  }
                />

                <p className="text-sm text-mu mt-3 mb-2">Séries</p>

                <div className="space-y-2">
                  {exercise.sets.map((set, setIndex) => (
                    <div
                      key={set.id}
                      className="grid grid-cols-2 gap-2"
                    >
                      <Field
                        label={`S${setIndex + 1} reps`}
                        type="number"
                        min="0"
                        value={set.reps === 0 ? '' : set.reps}
                        onChange={(event) =>
                          updateSet(exercise, set.id, {
                            reps:
                              event.target.value === ''
                                ? 0
                                : Number(event.target.value),
                          })
                        }
                      />

                      <Field
                        label="Peso kg"
                        type="number"
                        min="0"
                        step="0.5"
                        value={set.weight === 0 ? '' : set.weight}
                        onChange={(event) =>
                          updateSet(exercise, set.id, {
                            weight:
                              event.target.value === ''
                                ? 0
                                : Number(event.target.value),
                          })
                        }
                      />
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

          {form.id && (
            <Btn
              variant="danger"
              className="w-full mt-2"
              onClick={() => remove(form)}
            >
              Excluir treino
            </Btn>
          )}
        </Sheet>
      )}
    </>
  );
}
