import type { Exercise, Workout } from './types';
import type { Proposal } from './aiProposals';
import { uid } from './utils';

export function makeExercise(data: { name: string; count?: number; reps?: number; weight: number; rest?: number }): Exercise {
  const pending = data.count === undefined;
  return {
    id: uid(), name: data.name.trim(), rest: data.rest ?? 0, notes: '',
    sets: Array.from({ length: data.count ?? 0 }, () => ({ id: uid(), reps: data.reps ?? 0, weight: data.weight })),
    ...(pending ? { pendingWeight: data.weight, ...(data.reps === undefined ? {} : { pendingReps: data.reps }) } : {})
  };
}

export function applyExerciseChange(workout: Workout, change: NonNullable<Proposal['exerciseChange']>): Workout {
  const normalize = (s: string) => s.trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const matches = workout.exercises.filter(e => normalize(e.name) === normalize(change.name));
  if (change.operation === 'add') {
    if (matches.length) throw new Error('Já existe um exercício com esse nome.');
    const exercise = makeExercise({ name: change.name, count: change.count, reps: change.reps, weight: change.weight!, rest: change.rest });
    return { ...workout, exercises: [...workout.exercises, exercise] };
  }
  if (matches.length !== 1) throw new Error(matches.length ? 'Há exercícios com o mesmo nome. Edite-os manualmente.' : 'Exercício não encontrado no treino selecionado.');
  const selected = matches[0];
  if (change.operation === 'remove') return { ...workout, exercises: workout.exercises.filter(e => e.id !== selected.id) };
  if (change.newName && workout.exercises.some(e => e.id !== selected.id && normalize(e.name) === normalize(change.newName!))) {
    throw new Error('Já existe um exercício com o novo nome.');
  }
  const count = change.count ?? selected.sets.length;
  if (selected.sets.length === 0 && count === 0) return { ...workout, exercises: workout.exercises.map(e => e.id === selected.id ? { ...e, name: change.newName ?? e.name, rest: change.rest ?? e.rest, pendingWeight: change.weight ?? e.pendingWeight, pendingReps: change.reps ?? e.pendingReps } : e) };
  if (selected.sets.length === 0 && count > 0) {
    const weight = change.weight ?? selected.pendingWeight;
    if (weight === undefined) throw new Error('Informe a carga para as novas séries.');
    const { pendingWeight: _weight, pendingReps: _reps, ...base } = selected;
    const sets = Array.from({ length: count }, () => ({ id: uid(), reps: change.reps ?? selected.pendingReps ?? 0, weight }));
    return { ...workout, exercises: workout.exercises.map(e => e.id === selected.id ? { ...base, name: change.newName ?? base.name, rest: change.rest ?? base.rest, sets } : e) };
  }
  if (count > selected.sets.length && (change.reps === undefined || change.weight === undefined)) throw new Error('Informe repetições e carga para as novas séries.');
  const sets = Array.from({ length: count }, (_, i) => {
    const old = selected.sets[i];
    return { ...old, id: old?.id ?? uid(), reps: change.reps ?? old.reps, weight: change.weight ?? old.weight };
  });
  return { ...workout, exercises: workout.exercises.map(e => e.id === selected.id ? { ...e, name: change.newName ?? e.name, rest: change.rest ?? e.rest, sets } : e) };
}
