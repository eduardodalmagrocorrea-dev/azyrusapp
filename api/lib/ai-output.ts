import { validateProposals, type Proposal } from '../../src/aiProposals.js';

export const recordTypes = ['habit', 'event', 'finance', 'goal', 'workout', 'note', 'meal', 'water'] as const;
export type Issue = { registro: string; motivo: string };
export class ModelFormatError extends Error {}

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export function parseModelJson(text: unknown): unknown {
  if (typeof text !== 'string' || text.length > 160_000) throw new ModelFormatError('Resposta ausente ou extensa demais.');
  const fenced = /^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/i.exec(text);
  try { return JSON.parse(fenced?.[1] ?? text); }
  catch { throw new ModelFormatError('A resposta não contém JSON válido.'); }
}

function identity(raw: unknown) {
  if (!object(raw) || !recordTypes.some(type => type === raw.type) ||
    !['create', 'update', 'delete'].some(action => action === raw.action) ||
    typeof raw.name !== 'string' || !raw.name.trim() || raw.name.length > 200 ||
    'targetId' in raw || 'expectedUpdatedAt' in raw) return undefined;
  return JSON.stringify([raw.type, raw.action, raw.name.trim()]);
}

const numericFields = ['amount', 'calories', 'protein', 'carbs', 'fat', 'day', 'count', 'reps', 'weight', 'rest'];

function normalizeFormat(raw: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...raw };
  for (const key of numericFields) {
    const value = normalized[key];
    if (typeof value === 'string' && /^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) normalized[key] = Number(value.trim().replace(',', '.'));
  }
  if (typeof normalized.time === 'string' && /^\d:[0-5]\d$/.test(normalized.time)) normalized.time = '0' + normalized.time;
  for (const key of ['dayTimes', 'exercises', 'exerciseChanges']) {
    const value = normalized[key];
    if (Array.isArray(value)) normalized[key] = value.map(item => object(item) ? normalizeFormat(item) : item);
  }
  if (object(normalized.exerciseChange)) normalized.exerciseChange = normalizeFormat(normalized.exerciseChange);
  return normalized;
}

export function validateModelProposal(raw: unknown): Proposal {
  if (!object(raw) || !identity(raw)) throw new Error('Informe a categoria, a operação e o nome do registro.');
  return validateProposals([normalizeFormat(raw)])[0];
}

export function readBatch(value: unknown) {
  if (!object(value) || !Array.isArray(value.registros) || value.registros.length > 100) {
    throw new ModelFormatError('A interpretação precisa conter uma lista de registros.');
  }
  const issues: Issue[] = [];
  const pending = value.pendencias;
  if (pending !== undefined && (!Array.isArray(pending) || pending.length + value.registros.length > 100)) {
    throw new ModelFormatError('A interpretação contém pendências inválidas ou mais de 100 itens.');
  }
  if (Array.isArray(pending)) {
    for (const [index, item] of pending.entries()) {
      issues.push(object(item) && typeof item.registro === 'string' && item.registro.trim() &&
        item.registro.length <= 200 && typeof item.motivo === 'string' && item.motivo.trim() && item.motivo.length <= 1000 &&
        !/\b(?:salv|grav|aplic|conclu|exclu|cadast|confirm)(?:ei|ou|ad[oa]s?|í[dg][oa]s?)\b/i.test(item.motivo)
        ? { registro: item.registro, motivo: item.motivo }
        : { registro: `Pendência ${index + 1}`, motivo: 'Reformule esta parte do comando para que ela possa ser analisada.' });
    }
  } else if (value.pendencia === true) {
    issues.push({ registro: 'Comando', motivo: 'Há uma parte do comando que precisa de esclarecimento.' });
    return { issues, rows: [] };
  }
  const rows = value.registros.map((raw: unknown, index: number) => {
    try {
      return { proposal: validateModelProposal(raw) };
    } catch (error) {
      const name = object(raw) && typeof raw.name === 'string' && raw.name.trim() ? raw.name.slice(0, 200) : `Alteração ${index + 1}`;
      const issue = { registro: name, motivo: error instanceof Error ? error.message : 'Revise os dados solicitados.' };
      const key = object(raw) && raw.action !== 'delete' ? identity(raw) : undefined;
      return { issue, repair: key ? { index, key, raw, error: issue.motivo } : undefined };
    }
  });
  return { issues, rows };
}

export function readRepairs(value: unknown, candidates: ReadonlyMap<number, string>) {
  const repairs = new Map<number, Proposal>();
  if (!object(value) || !Array.isArray(value.correcoes) || value.correcoes.length > 100) return repairs;
  const repeated = new Set<number>();
  for (const entry of value.correcoes) {
    if (!object(entry) || typeof entry.indice !== 'number' || !candidates.has(entry.indice)) continue;
    const index = entry.indice;
    if (repeated.has(index)) { repairs.delete(index); continue; }
    repeated.add(index);
    if (identity(entry.registro) !== candidates.get(index)) continue;
    try {
      repairs.set(index, validateModelProposal(entry.registro));
    } catch {
      // Keep the original issue for the user to review.
    }
  }
  return repairs;
}
