import { validateProposals, type Proposal } from './aiProposals';
import { applyExerciseChange, makeExercise } from './aiWorkout';
import type { FinanceTransaction, Goal, Habit, MealEntry, Note, Task, WaterEntry, Workout } from './types';
import { DOW, today, uid } from './utils';

export type AIRecords = {
  habit: Habit;
  event: Task;
  finance: FinanceTransaction;
  goal: Goal;
  workout: Workout;
  note: Note;
  meal: MealEntry;
  water: WaterEntry;
};
export type AICollections = { [K in keyof AIRecords]: AIRecords[K][] };
type RecordValue = AIRecords[keyof AIRecords];
export type AITarget = { type: Proposal['type']; id: string; name: string; detail: string };

export const categoryLabels = {
  habit: 'Hábito', event: 'Evento', finance: 'Finanças', goal: 'Meta',
  workout: 'Treino', note: 'Nota', meal: 'Refeição', water: 'Água',
};

const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '')
  .toLocaleLowerCase('pt-BR').trim().replace(/\s+/g, ' ');

function nameOf(record: RecordValue) {
  if ('name' in record) return record.name;
  if ('title' in record) return record.title;
  if ('description' in record) return record.description;
  if ('food' in record) return record.food;
  return 'Água';
}

function detailOf(record: RecordValue) {
  if ('content' in record) return record.updatedAt;
  if ('days' in record) return [record.category, record.time, ...record.days.map(day => DOW[day])].filter(Boolean).join(' · ');
  if ('exercises' in record) return [record.day === undefined ? '' : DOW[record.day], record.date].filter(Boolean).join(' · ');
  if ('due' in record) return [record.category, record.due].filter(Boolean).join(' · ');
  if ('meal' in record) return `${record.date} · ${record.meal}`;
  if ('priority' in record) return [record.date, record.time, record.category].filter(Boolean).join(' · ');
  if ('amount' in record) return `${record.date} · ${'type' in record ? `R$ ${record.amount} · ${record.type}` : `${record.amount} ml`}`;
  return '';
}

export function listTargets(collections: AICollections): AITarget[] {
  return (Object.keys(categoryLabels) as Proposal['type'][]).flatMap(type =>
    collections[type].map(record => ({ type, id: record.id, name: nameOf(record), detail: detailOf(record) }))
  );
}

export function catalogForCommand(targets: AITarget[]) {
  const groups = new Map<string, { type: Proposal['type']; name: string; count: number }>();
  for (const { type, name } of targets) {
    const key = JSON.stringify([type, normalize(name)]);
    const existing = groups.get(key);
    if (existing) existing.count++;
    else groups.set(key, { type, name, count: 1 });
  }
  return [...groups.values()];
}

export function matchingTargets(item: Proposal, targets: AITarget[]) {
  const name = normalize(item.name);
  return targets.filter(target => target.type === item.type && normalize(target.name) === name);
}

export function describeRecord(record: RecordValue): { Nome: string } & Record<string, string | number> {
  const Nome = nameOf(record);
  if ('days' in record) return { Nome, Categoria: record.category, Horário: record.time, Dias: [...record.days].sort().map(day => DOW[day]).join(', '), Lembrete: record.reminderEnabled ? 'Ativo' : 'Desativado' };
  if ('priority' in record) return { Nome, Data: record.date, Horário: record.time, Categoria: record.category };
  if ('description' in record) return { Nome, Data: record.date, Tipo: record.type, Categoria: record.category, 'Valor (R$)': record.amount };
  if ('due' in record) return { Nome, Prazo: record.due, Categoria: record.category, Descrição: record.desc };
  if ('content' in record) return { Nome, Conteúdo: record.content };
  if ('exercises' in record) return {
    Nome, Dia: record.day === undefined ? '' : DOW[record.day],
    Exercícios: record.exercises.map(e => {
      const sets = e.sets.map(s => `${s.reps || 'repetições pendentes'} × ${s.weight} kg`).join(', ');
      const pending = e.pendingWeight === undefined ? '' : ` · ${e.pendingWeight} kg · ${e.pendingReps ?? 'repetições pendentes'}`;
      return `${e.name} · ${sets || 'séries pendentes' + pending} · ${e.rest} s de descanso`;
    }).join('\n'),
  };
  if ('meal' in record) return { Nome, Data: record.date, Refeição: record.meal, 'Calorias (kcal)': record.calories, 'Proteína (g)': record.protein, 'Carboidratos (g)': record.carbs, 'Gorduras (g)': record.fat };
  return { Nome, Data: record.date, 'Volume (ml)': record.amount };
}

export function deletionDetails(record: RecordValue) {
  if ('days' in record) return { 'Marcações concluídas': record.done.length };
  if ('exercises' in record) return { 'Treinos concluídos': record.completedDates?.length || Number(record.completed) };
  if ('due' in record) return { 'Progresso (%)': record.pct, 'Registros físicos': record.physicalRecords?.length ?? 0 };
  if ('priority' in record) return { Concluído: record.done ? 'Sim' : 'Não' };
  return {};
}

function createRecord(item: Proposal): RecordValue {
  const id = uid();
  const name = item.name.trim();
  const { category, description, date, time } = item;
  switch (item.type) {
    case 'habit': return { id, name, category: category || 'Pessoal', time: time || '', days: item.days!, reminderEnabled: item.reminder, done: [], created: today() };
    case 'event': return { id, title: name, date: date!, time: time || '', priority: 1, category: category || 'Pessoal', done: false };
    case 'finance': return { id, description: name, date: date!, type: item.direction!, category: category || 'Outro', amount: item.amount! };
    case 'goal': return { id, title: name, desc: description || '', due: date || '', category: category || 'Pessoal', status: 'ativa', tracked: false, unit: '', start: 0, current: 0, target: 100, pct: 0 };
    case 'workout': return { id, name, date: today(), day: item.day!, duration: 0, notes: '', completed: false, exercises: item.exercises!.map(makeExercise) };
    case 'note': {
      const now = new Date().toISOString();
      return { id, title: name, content: description!, createdAt: now, updatedAt: now };
    }
    case 'meal': return { id, food: name, date: date!, meal: item.meal!, calories: item.calories!, protein: item.protein!, carbs: item.carbs!, fat: item.fat! };
    case 'water': return { id, date: date!, amount: item.amount! };
  }
}

function updateRecord(item: Proposal, record: RecordValue): RecordValue {
  const name = item.newName?.trim();
  const { date, time, category, description } = item;
  if ('days' in record) {
    const updated = { ...record, name: name ?? record.name, category: category ?? record.category, time: time ?? record.time, days: item.days ?? record.days, reminderEnabled: item.reminder ?? record.reminderEnabled };
    if (updated.reminderEnabled && (!updated.days.length || !/^([01]\d|2[0-3]):[0-5]\d$/.test(updated.time))) {
      throw new Error('Informe dias e um horário válido para o lembrete.');
    }
    return updated;
  }
  if ('priority' in record) return { ...record, title: name ?? record.title, date: date ?? record.date, time: time ?? record.time, category: category ?? record.category };
  if ('description' in record) return { ...record, description: name ?? record.description, date: date ?? record.date, category: category ?? record.category, amount: item.amount ?? record.amount, type: item.direction ?? record.type };
  if ('due' in record) return { ...record, title: name ?? record.title, desc: description ?? record.desc, due: date ?? record.due, category: category ?? record.category };
  if ('content' in record) {
    if (item.expectedUpdatedAt !== undefined && item.expectedUpdatedAt !== record.updatedAt) throw new Error('A nota mudou. Gere uma nova prévia.');
    const title = name ?? record.title;
    const content = description ?? record.content;
    if (title === record.title && content === record.content) return record;
    return { ...record, title, content, updatedAt: new Date().toISOString() };
  }
  if ('exercises' in record) {
    const changes = item.exerciseChanges ?? (item.exerciseChange ? [item.exerciseChange] : []);
    const updated = changes.reduce(applyExerciseChange, record);
    return { ...updated, name: name ?? record.name, day: item.day ?? record.day };
  }
  if ('meal' in record) return { ...record, food: name ?? record.food, date: date ?? record.date, meal: item.meal ?? record.meal, calories: item.calories ?? record.calories, protein: item.protein ?? record.protein, carbs: item.carbs ?? record.carbs, fat: item.fat ?? record.fat };
  return { ...record, date: date ?? record.date, amount: item.amount ?? record.amount };
}

function signature(record: RecordValue) {
  const { Nome, ...fields } = describeRecord(record);
  return JSON.stringify([normalize(Nome), fields]);
}

export function reviewBatch(items: Proposal[], collections: AICollections, targets: AITarget[]) {
  const previews = items.map<{ before?: RecordValue; after?: RecordValue; error?: string }>(raw => {
    try {
      const [item] = validateProposals([raw]);
      if (!item.action || item.action === 'create') return { after: createRecord(item) };
      const matches = matchingTargets(item, targets);
      if (!matches.length) throw new Error('Registro não encontrado. Use o nome atual completo.');
      const target = item.targetId ? matches.find(match => match.id === item.targetId) : matches.length === 1 ? matches[0] : undefined;
      if (!target) throw new Error(item.targetId ? 'A seleção mudou. Gere uma nova prévia.' : 'Há registros com o mesmo nome. Selecione qual deseja alterar.');
      const before = collections[item.type].find(record => record.id === target.id);
      if (!before) throw new Error('Registro não encontrado. Gere uma nova prévia.');
      return { before, after: item.action === 'update' ? updateRecord(item, before) : undefined };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Alteração inválida.' };
    }
  });
  const changes = new Map<Proposal['type'], RecordValue[]>();
  const visited = new Set<string>();
  previews.forEach((preview, index) => {
    if (preview.error) return;
    const { type } = items[index];
    const { before, after } = preview;
    const key = `${type}:${before?.id}`;
    if (before && visited.has(key)) {
      preview.error = 'O mesmo registro foi selecionado mais de uma vez. Reúna as mudanças em uma edição.';
      return;
    }
    if (before) visited.add(key);
    if (before && after && JSON.stringify(before) === JSON.stringify(after)) return;
    const list = changes.get(type) ?? collections[type];
    const next = before
      ? list.flatMap(record => record.id === before.id ? after ? [after] : [] : [record])
      : type === 'note' ? [after!, ...list] : [...list, after!];
    changes.set(type, next);
  });
  const counts = new Map<Proposal['type'], Map<string, number>>();
  for (const [type, records] of changes) {
    const bySignature = new Map<string, number>();
    for (const record of records) {
      const value = signature(record);
      bySignature.set(value, (bySignature.get(value) ?? 0) + 1);
    }
    counts.set(type, bySignature);
  }
  previews.forEach((preview, index) => {
    if (preview.error || !preview.after) return;
    const value = signature(preview.after);
    if (preview.before && signature(preview.before) === value) return;
    if ((counts.get(items[index].type)?.get(value) ?? 0) > 1) {
      preview.error = 'Essa mudança criaria um registro duplicado. Revise os valores ou remova a proposta.';
    }
  });
  return { previews, changes, valid: items.length > 0 && previews.every(preview => !preview.error) };
}

export type AIReview = ReturnType<typeof reviewBatch>;
