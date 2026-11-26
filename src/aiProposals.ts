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
  exerciseChange?: ExerciseChange;
  exerciseChanges?: ExerciseChange[];
};
type ExerciseChange = { operation: 'add' | 'update' | 'remove'; name: string; newName?: string; count?: number; reps?: number; weight?: number; rest?: number };

const dateOk = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T00:00:00Z')) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v;

const weekdays = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const abbreviations = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const daysError = 'Informe os dias do hábito, por exemplo “todos os dias”, “segunda a sexta” ou “segunda, quarta e sexta”.';

function parseDays(input: unknown): number[] {
  const parse = (value: unknown): number[] => {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6) return [value];
    if (typeof value !== 'string' || value.length > 150) throw new Error(daysError);
    const text = value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
      .replace(/[- ]feiras?\b/g, '').replace(/\s+/g, ' ');
    if (['todos os dias', 'todo dia', 'diariamente', 'todos os dias da semana'].includes(text)) return [0, 1, 2, 3, 4, 5, 6];
    if (['dias uteis', 'nos dias uteis'].includes(text)) return [1, 2, 3, 4, 5];
    if (/^(?:aos? )?(?:fins?|finais?) de semana$/.test(text)) return [0, 6];
    const dayIndex = (day: string) => {
      const token = day.replace(/^(?:de|da|do|as|aos|nas|nos) /, '')
        .replace(/^(segund|terc|quart|quint|sext|sabad|doming)([ao])s$/, '$1$2');
      const full = weekdays.indexOf(token);
      return full >= 0 ? full : abbreviations.indexOf(token);
    };
    return text.split(/\s*(?:[,;/]|\be\b)\s*/).flatMap(part => {
      if (/^[0-6]$/.test(part)) return [Number(part)];
      const range = part.split(/\s+(?:a|ate|ao)\s+|\s*[–—-]\s*/);
      const first = dayIndex(range[0]);
      if (range.length === 1 && first >= 0) return [first];
      const last = range.length === 2 ? dayIndex(range[1]) : -1;
      if (first < 0 || last < 0) throw new Error(daysError);
      return Array.from({ length: (last - first + 7) % 7 + 1 }, (_, i) => (first + i) % 7);
    });
  };
  const values = Array.isArray(input) ? input : [input];
  if (!values.length || values.length > 30) throw new Error(daysError);
  return [...new Set(values.flatMap(parse))].sort((a, b) => a - b);
}

export function validateProposals(input: unknown): Proposal[] {
  if (!Array.isArray(input) || !input.length || input.length > 100) throw new Error('A interpretação precisa conter entre 1 e 100 registros.');
  return input.map((raw: any) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Registro inválido.');
    const { daysText, ...item } = raw;
    if (daysText !== undefined && (item.type !== 'habit' || item.action === 'delete' || typeof daysText !== 'string')) throw new Error(daysError);
    if (item.type === 'habit' && item.action !== 'delete' && (daysText !== undefined || item.days !== undefined)) {
      const days = parseDays(daysText ?? item.days);
      if (daysText !== undefined && item.days !== undefined && parseDays(item.days).join() !== days.join()) {
        throw new Error('A interpretação apresentou dois conjuntos de dias diferentes para o mesmo hábito.');
      }
      item.days = days;
    }
    const allowed = ['type', 'name', 'action', 'targetId', 'expectedUpdatedAt', 'newName', 'date', 'time', 'days', 'reminder', 'amount', 'direction', 'category', 'description', 'day', 'exercises', 'exerciseChange', 'exerciseChanges', 'meal', 'calories', 'protein', 'carbs', 'fat'];
    if (Object.keys(item).some(key => !allowed.includes(key))) throw new Error('Campo desconhecido na interpretação.');
    if (!['habit', 'event', 'finance', 'goal', 'workout', 'note', 'meal', 'water'].includes(item.type) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 200) throw new Error('Informe um tipo válido e um nome de até 200 caracteres.');
    if (item.action !== undefined && !['create', 'delete', 'update'].includes(item.action)) throw new Error('Operação inválida.');
    if (item.action === 'update') {
      const fields: Record<string, string[]> = { habit: ['newName','category','time','days','reminder'], event: ['newName','category','date','time'], finance: ['newName','category','date','amount','direction'], goal: ['newName','category','date','description'], workout: ['newName','day','exerciseChange','exerciseChanges'], note: ['newName','description'], meal: ['newName','date','meal','calories','protein','carbs','fat'], water: ['date','amount'] };
      const changed = Object.keys(item).filter(key => item[key] !== undefined && !['type','name','action','targetId','expectedUpdatedAt'].includes(key));
      if (!changed.length || changed.some(key => !fields[item.type].includes(key))) throw new Error('Campos de edição inválidos.');
      if (item.targetId !== undefined && (typeof item.targetId !== 'string' || !item.targetId || item.targetId.length > 200)) throw new Error('Registro selecionado inválido.');
      if (item.expectedUpdatedAt !== undefined && (item.type !== 'note' || typeof item.expectedUpdatedAt !== 'string' || item.expectedUpdatedAt.length > 100)) throw new Error('Versão da nota inválida.');
      if (item.exerciseChange !== undefined) validateExerciseChange(item.exerciseChange);
      if (item.exerciseChanges !== undefined) {
        if (item.exerciseChange !== undefined || !Array.isArray(item.exerciseChanges) || !item.exerciseChanges.length || item.exerciseChanges.length > 30) {
          throw new Error('A edição do treino deve conter entre 1 e 30 alterações de exercícios.');
        }
        item.exerciseChanges.forEach(validateExerciseChange);
      }
      if (item.date !== undefined && !dateOk(item.date)) throw new Error('Data inválida.');
      for (const key of ['newName','category','description']) if (item[key] !== undefined && (typeof item[key] !== 'string' || !item[key].trim() || item[key].length > (key === 'newName' ? 200 : key === 'description' && item.type === 'note' ? 12000 : 1000))) throw new Error('Texto inválido.');
      if (item.time !== undefined && (typeof item.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time))) throw new Error('Horário inválido.');
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
    const createFields: Record<Proposal['type'], string[]> = {
      habit: ['category','time','days','reminder'], event: ['category','date','time'],
      finance: ['category','date','amount','direction'], goal: ['category','date','description'],
      workout: ['day','exercises'], note: ['description'],
      meal: ['date','meal','calories','protein','carbs','fat'], water: ['date','amount'],
    };
    if (Object.keys(item).some(key => !['type','action','name',...createFields[item.type as Proposal['type']]].includes(key))) {
      throw new Error('Campos de criação inválidos.');
    }
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
      if (item.days === undefined) throw new Error(daysError);
      if (typeof item.reminder !== 'boolean' || (item.reminder && !item.time)) throw new Error('Informe se há lembrete e o horário correspondente.');
    }
    if ((item.type === 'event' || item.type === 'finance') && !dateOk(item.date)) throw new Error('Informe uma data válida para o evento ou lançamento.');
    if (item.type === 'finance' && (!['receita','despesa'].includes(item.direction) || typeof item.amount !== 'number' || !Number.isFinite(item.amount) || item.amount <= 0 || item.amount > 1000000000)) throw new Error('Informe o tipo e um valor financeiro positivo.');
    return item as Proposal;
  });
}

function validateExerciseChange(e: any) {
  if (!e || typeof e !== 'object' || Array.isArray(e) || Object.keys(e).some(k => !['operation','name','newName','count','reps','weight','rest'].includes(k)) || !['add','update','remove'].includes(e.operation) || typeof e.name !== 'string' || !e.name.trim() || e.name.length > 200) throw new Error('Exercício inválido.');
  if (e.newName !== undefined && (typeof e.newName !== 'string' || !e.newName.trim() || e.newName.length > 200)) throw new Error('Nome de exercício inválido.');
  for (const key of ['count','reps','rest']) if (e[key] !== undefined && (!Number.isInteger(e[key]) || e[key] < (key === 'rest' ? 0 : 1) || e[key] > (key === 'count' ? 30 : key === 'reps' ? 1000 : 86400))) throw new Error('Valor do exercício inválido.');
  if (e.weight !== undefined && (typeof e.weight !== 'number' || !Number.isFinite(e.weight) || e.weight < 0 || e.weight > 10000)) throw new Error('Carga inválida.');
  if (e.operation === 'add' && e.weight === undefined) throw new Error('Informe a carga para o novo exercício.');
  if (e.operation === 'remove' && Object.keys(e).some(k => !['operation','name'].includes(k))) throw new Error('Remoção de exercício inválida.');
  if (e.operation === 'update' && !['newName','count','reps','weight','rest'].some(k => e[k] !== undefined)) throw new Error('Informe o que deseja alterar no exercício.');
}
