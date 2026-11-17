/** Strictly validated proposals; unsupported or ambiguous commands never write data. */
export type Proposal = {
  type: 'habit' | 'event' | 'finance' | 'goal' | 'workout' | 'note' | 'meal' | 'water';
  name: string;
  action?: 'create' | 'delete' | 'update';
  targetId?: string;
  expectedUpdatedAt?: string;
  newName?: string;
  date?: string;
  time?: string;
  days?: number[];
  reminder?: boolean;
  amount?: number;
  direction?: 'receita' | 'despesa';
  category?: string;
  description?: string;
  meal?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  day?: number;
  exercises?: { name: string; count?: number; reps?: number; weight: number; rest?: number }[];
  exerciseChange?: { operation: 'add' | 'update' | 'remove'; name: string; newName?: string; count?: number; reps?: number; weight?: number; rest?: number };
};
const dateOk = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T00:00:00Z')) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v;
export function validateProposals(input: unknown): Proposal[] {
  if (!Array.isArray(input) || !input.length || input.length > 20) throw new Error('A interpretação precisa conter entre 1 e 20 registros.');
  return input.map((item: any) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Registro inválido.');
    const allowed = ['type', 'name', 'action', 'targetId', 'expectedUpdatedAt', 'newName', 'date', 'time', 'days', 'reminder', 'amount', 'direction', 'category', 'description', 'day', 'exercises', 'exerciseChange', 'meal', 'calories', 'protein', 'carbs', 'fat'];
    if (Object.keys(item).some(key => !allowed.includes(key))) throw new Error('Campo desconhecido na interpretação.');
    if (!['habit', 'event', 'finance', 'goal', 'workout', 'note', 'meal', 'water'].includes(item.type) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 200) throw new Error('Informe um tipo válido e um nome de até 200 caracteres.');
    if (item.action !== undefined && !['create', 'delete', 'update'].includes(item.action)) throw new Error('Operação inválida.');
    if (item.action === 'update') {
      const fields: Record<string, string[]> = { habit: ['newName','category','time','days','reminder'], event: ['newName','category','date','time'], finance: ['newName','category','date','amount','direction'], goal: ['newName','category','date','description'], workout: ['newName','day','exerciseChange'], note: ['newName','description'], meal: ['newName','date','meal','calories','protein','carbs','fat'], water: ['date','amount'] };
      const changed = Object.keys(item).filter(key => !['type','name','action','targetId','expectedUpdatedAt'].includes(key));
      if (!changed.length || changed.some(key => !fields[item.type].includes(key))) throw new Error('Campos de edição inválidos.');
      if (item.targetId !== undefined && (typeof item.targetId !== 'string' || !item.targetId || item.targetId.length > 200)) throw new Error('Registro selecionado inválido.');
      if (item.expectedUpdatedAt !== undefined && (item.type !== 'note' || typeof item.expectedUpdatedAt !== 'string' || item.expectedUpdatedAt.length > 100)) throw new Error('Versão da nota inválida.');
      if (item.exerciseChange !== undefined) {
        const e = item.exerciseChange;
        if (!e || typeof e !== 'object' || Array.isArray(e) || Object.keys(e).some(k => !['operation','name','newName','count','reps','weight','rest'].includes(k)) || !['add','update','remove'].includes(e.operation) || typeof e.name !== 'string' || !e.name.trim() || e.name.length > 200) throw new Error('Exercício inválido.');
        if (e.newName !== undefined && (typeof e.newName !== 'string' || !e.newName.trim() || e.newName.length > 200)) throw new Error('Nome de exercício inválido.');
        for (const key of ['count','reps','rest']) if (e[key] !== undefined && (!Number.isInteger(e[key]) || e[key] < (key === 'rest' ? 0 : 1) || e[key] > (key === 'count' ? 30 : key === 'reps' ? 1000 : 86400))) throw new Error('Valor do exercício inválido.');
        if (e.weight !== undefined && (typeof e.weight !== 'number' || !Number.isFinite(e.weight) || e.weight < 0 || e.weight > 10000)) throw new Error('Carga inválida.');
        if (e.operation === 'add' && e.weight === undefined) throw new Error('Informe a carga para o novo exercício.');
        if (e.operation === 'remove' && Object.keys(e).some(k => !['operation','name'].includes(k))) throw new Error('Remoção de exercício inválida.');
        if (e.operation === 'update' && !['newName','count','reps','weight','rest'].some(k => e[k] !== undefined)) throw new Error('Informe o que deseja alterar no exercício.');
      }
      if (item.date !== undefined && !dateOk(item.date)) throw new Error('Data inválida.');
      for (const key of ['newName','category','description']) if (item[key] !== undefined && (typeof item[key] !== 'string' || !item[key].trim() || item[key].length > (key === 'description' && item.type === 'note' ? 12000 : 1000))) throw new Error('Texto inválido.');
      if (item.time !== undefined && (typeof item.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time))) throw new Error('Horário inválido.');
      if (item.days !== undefined && (!Array.isArray(item.days) || !item.days.length || item.days.some((d: unknown) => !Number.isInteger(d) || (d as number) < 0 || (d as number) > 6) || new Set(item.days).size !== item.days.length)) throw new Error('Dias inválidos.');
      if (item.reminder !== undefined && typeof item.reminder !== 'boolean') throw new Error('Lembrete inválido.');
      if (item.day !== undefined && (!Number.isInteger(item.day) || item.day < 0 || item.day > 6)) throw new Error('Dia inválido.');
      if (item.direction !== undefined && !['receita','despesa'].includes(item.direction)) throw new Error('Tipo inválido.');
      if (item.meal !== undefined && !['Café da manhã','Almoço','Lanche','Jantar','Outro'].includes(item.meal)) throw new Error('Refeição inválida.');
      for (const key of ['amount','calories','protein','carbs','fat']) if (item[key] !== undefined && (typeof item[key] !== 'number' || !Number.isFinite(item[key]) || item[key] < (key === 'amount' ? Number.MIN_VALUE : 0) || item[key] > 1000000)) throw new Error('Valor inválido.');
      return item as Proposal;
    }
    if (item.action === 'delete') {
      if (item.targetId !== undefined && (typeof item.targetId !== 'string' || !item.targetId || item.targetId.length > 200)) throw new Error('Registro selecionado inválido.');
      if (Object.keys(item).some(key => !['type', 'name', 'action', 'targetId'].includes(key))) throw new Error('Dados inesperados na exclusão.');
      return item as Proposal;
    }
    if (item.targetId !== undefined) throw new Error('Operação inválida.');
    for (const key of ['category', 'description']) if (item[key] !== undefined && (typeof item[key] !== 'string' || item[key].length > 1000)) throw new Error('Texto inválido.');
    if (item.type === 'note' && (typeof item.description !== 'string' || !item.description.trim())) throw new Error('Informe o conteúdo da nota.');
    if (item.type === 'meal') {
      if (!dateOk(item.date) || !['Café da manhã', 'Almoço', 'Lanche', 'Jantar', 'Outro'].includes(item.meal)) throw new Error('Informe a data e a refeição.');
      for (const key of ['calories', 'protein', 'carbs', 'fat']) if (typeof item[key] !== 'number' || !Number.isFinite(item[key]) || item[key] < 0 || item[key] > 100000) throw new Error('Informe calorias e macronutrientes, usando zero somente quando conhecido.');
    }
    if (item.type === 'water' && (!dateOk(item.date) || typeof item.amount !== 'number' || !Number.isFinite(item.amount) || item.amount <= 0 || item.amount > 100000)) throw new Error('Informe a data e o volume de água em ml.');
    if (item.date !== undefined && item.date !== '' && !dateOk(item.date)) throw new Error('Data inválida. Use AAAA-MM-DD.');
    if (item.time !== undefined && item.time !== '' && (typeof item.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time))) throw new Error('Horário inválido. Use HH:MM.');
    if (item.type === 'workout') {
      if (!Number.isInteger(item.day) || item.day < 0 || item.day > 6 || !Array.isArray(item.exercises) || item.exercises.length < 1 || item.exercises.length > 30) throw new Error('Informe o dia e os exercicios do treino.');
      for (const exercise of item.exercises) {
        if (!exercise || typeof exercise !== 'object' || Object.keys(exercise).some(k => !['name','count','reps','weight','rest'].includes(k)) || typeof exercise.name !== 'string' || !exercise.name.trim() || exercise.name.length > 200 || (exercise.count !== undefined && (!Number.isInteger(exercise.count) || exercise.count < 1 || exercise.count > 30)) || (exercise.reps !== undefined && (!Number.isInteger(exercise.reps) || exercise.reps < 1 || exercise.reps > 1000)) || typeof exercise.weight !== 'number' || !Number.isFinite(exercise.weight) || exercise.weight < 0 || exercise.weight > 10000 || (exercise.rest !== undefined && (!Number.isInteger(exercise.rest) || exercise.rest < 0 || exercise.rest > 86400))) throw new Error('Informe um nome e uma carga válidos para cada exercício.');
      }
    }
    if (item.type === 'habit') {
      if (!Array.isArray(item.days) || !item.days.length || item.days.some((d: unknown) => !Number.isInteger(d) || (d as number) < 0 || (d as number) > 6) || new Set(item.days).size !== item.days.length) throw new Error('Informe os dias do hábito de 0 (domingo) a 6 (sábado).');
      if (typeof item.reminder !== 'boolean' || (item.reminder && !item.time)) throw new Error('Informe se há lembrete e o horário correspondente.');
    }
    if ((item.type === 'event' || item.type === 'finance') && !dateOk(item.date)) throw new Error('Informe uma data válida para o evento ou lançamento.');
    if (item.type === 'finance' && (!['receita','despesa'].includes(item.direction) || typeof item.amount !== 'number' || !Number.isFinite(item.amount) || item.amount <= 0 || item.amount > 1000000000)) throw new Error('Informe o tipo e um valor financeiro positivo.');
    return item as Proposal;
  });
}
