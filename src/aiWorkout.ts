import type { Exercise, Workout } from './types';
import type { Proposal } from './aiProposals';
import { uid } from './utils';

export function applyExerciseChange(workout: Workout, change: NonNullable<Proposal['exerciseChange']>): Workout {
  const normalize = (s: string) => s.trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const matches = workout.exercises.filter(e => normalize(e.name) === normalize(change.name));
  if (change.operation === 'add') {
    if (matches.length) throw new Error('Já existe um exercício com esse nome.');
    const exercise: Exercise = { id: uid(), name: change.name.trim(), rest: change.rest ?? 0, notes: '', sets: Array.from({ length: change.count! }, () => ({ id: uid(), reps: change.reps!, weight: change.weight! })) };
    return { ...workout, exercises: [...workout.exercises, exercise] };
  }
  if (matches.length !== 1) throw new Error(matches.length ? 'Há exercícios com o mesmo nome. Edite-os manualmente.' : 'Exercício não encontrado no treino selecionado.');
  const selected = matches[0];
  if (change.operation === 'remove') return { ...workout, exercises: workout.exercises.filter(e => e.id !== selected.id) };
  const count = change.count ?? selected.sets.length;
  if (count > selected.sets.length && (change.reps === undefined || change.weight === undefined)) throw new Error('Informe repetições e carga para as novas séries.');
  const sets = Array.from({ length: count }, (_, i) => {
    const old = selected.sets[i];
    return { id: old?.id ?? uid(), reps: change.reps ?? old.reps, weight: change.weight ?? old.weight };
  });
  return { ...workout, exercises: workout.exercises.map(e => e.id === selected.id ? { ...e, name: change.newName ?? e.name, rest: change.rest ?? e.rest, sets } : e) };
}
