// Uses the same request/validation code as the Vercel function with synthetic data.
// Run separately from the offline suite with GEMINI_API_KEY in the process environment.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

const key = process.env.GEMINI_API_KEY?.trim();
if (!key) {
  console.error('Teste real bloqueado: GEMINI_API_KEY indisponível para este processo.');
  process.exit(2);
}

function load(path, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, require: name => {
    if (!(name in dependencies)) throw new Error('Dependência inesperada no teste.');
    return dependencies[name];
  }, Error, AbortSignal, fetch, console, process: { env: { GEMINI_API_KEY: key } } };
  vm.runInNewContext(source, context, { filename: path });
  return context.exports;
}

const validation = load('src/aiProposals.ts');
const output = load('api/lib/ai-output.ts', { '../../src/aiProposals.js': validation });
const { default: handler } = load('api/ai.ts', {
  './lib/ai-output.js': output,
  './lib/security.js': { sameOrigin: () => true, session: () => true, limit: async () => true },
});
const utils = load('src/utils.ts');
const workout = load('src/aiWorkout.ts', { './utils': utils });
const { listTargets, catalogForCommand, reviewBatch } = load('src/aiBatch.ts', {
  './utils': utils, './aiProposals': validation, './aiWorkout': workout,
});
const collections = {
  habit: [{ id: 'test', name: 'LEITURA', category: 'Pessoal', time: '08:00', days: [1, 2, 3, 4, 5], reminderEnabled: true, done: ['2026-11-26'], created: '2026-11-01' }],
  note: [{ id: 'obsolete', title: 'Rascunho antigo', content: 'Teste', createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
  event: [], finance: [], goal: [], workout: [], meal: [], water: [],
};
const targets = listTargets(collections);

async function interpret(command) {
  const response = {
    setHeader() {},
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await handler({
    method: 'POST',
    body: { command, today: '2026-11-26', records: catalogForCommand(targets) },
  }, response);
  assert.equal(response.code, 200, response.body?.error);
  assert.equal(response.body.mensagem, undefined);
  return response.body;
}

(async () => {
  const simple = await interpret('Mude o horário padrão da leitura para as 7h30. Deixe os dias como estão.');
  assert.equal(simple.registros.length, 1);
  assert.equal(simple.pendencias.length, 0);
  assert.equal(simple.registros[0].action, 'update');
  assert.equal(simple.registros[0].time, '07:30');
  assert.equal(simple.registros[0].days, undefined);
  assert.equal(reviewBatch(simple.registros, collections, targets).valid, true);
  console.log('OK: comando natural e identificação do hábito existente.');

  const complex = await interpret([
    'No hábito de leitura, faça de segunda a sexta às 7h e nos fins de semana às 9h. Preserve o lembrete.',
    'Exclua a nota Rascunho antigo. Crie a nota Compras com o conteúdo “Leite e pão”.',
    'Agende Dentista no dia 2 de dezembro de 2026 às 14h30.',
    'Lance R$ 42,90 de despesa em Mercado hoje, categoria Alimentação.',
    'Crie a meta Corrida com prazo em 10 de dezembro de 2026 e descrição “Correr 5 km”.',
    'Crie o treino Costas na terça, com remada de 3 séries de 12 repetições, 30 kg e descanso de 60 segundos.',
    'Registre Iogurte no lanche de hoje com 120 kcal, 8 g de proteína, 12 g de carboidratos e 4 g de gordura, e 500 ml de água hoje.',
    'Também publique os registros nas redes sociais.',
  ].join(' '));
  assert.equal(complex.registros.length, 9);
  assert.ok(complex.pendencias.length > 0);
  const review = reviewBatch(complex.registros, collections, targets);
  assert.equal(review.valid, true, review.previews.map(item => item.error).filter(Boolean).join(' / '));
  assert.equal(review.changes.size, 8);
  const habit = review.changes.get('habit')[0];
  assert.equal(habit.id, 'test');
  assert.equal(habit.reminderEnabled, true);
  assert.equal(habit.done, collections.habit[0].done);
  assert.equal(utils.habitTime(habit, 1), '07:00');
  assert.equal(utils.habitTime(habit, 6), '09:00');
  assert.equal(review.changes.get('finance')[0].amount, 42.9);
  assert.equal(review.changes.get('event')[0].time, '14:30');
  assert.equal(review.changes.get('workout')[0].exercises[0].sets.length, 3);
  assert.equal(review.changes.get('meal')[0].protein, 8);
  assert.equal(review.changes.get('water')[0].amount, 500);
  assert.equal(review.changes.get('note').some(note => note.id === 'obsolete'), false);
  console.log('OK: lote em oito categorias, horários por dia e pendência isolada.');
})().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
