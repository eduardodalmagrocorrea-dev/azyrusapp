// Offline checks: no environment files, network, Supabase, or real credentials.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

function load(path, dependencies, globals = {}) {
  const source = fs.readFileSync(path, 'utf8').replace('import.meta.env', '({})');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, Buffer, URL, AbortSignal, console, ...globals };
  vm.runInNewContext(code, context, { filename: path });
  return context.exports;
}
function response() {
  return { code: 0, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.code = n; return this; }, json(body) { this.body = body; return this; } };
}
const env = { AUTH_SECRET: 'a'.repeat(64), AZYRUS_PASSWORD: 'a-test-password', GEMINI_API_KEY: 'fake-key' };
let limitResult = true;
const security = load('api/lib/security.ts', { 'node:crypto': require('node:crypto'), 'node:net': require('node:net'), './supabase.js': { supabase: { rpc: async () => ({ data: limitResult, error: null }) } } }, { process: { env } });
const auth = load('api/auth.ts', { './lib/security.js': security }, { process: { env } }).default;
const validate = load('src/aiProposals.ts', {}, { Date, Set }).validateProposals;
const utils = load('src/utils.ts', {}, { Date });
const workout = load('src/aiWorkout.ts', { './utils': utils });
const { reviewBatch, listTargets } = load('src/aiBatch.ts', {
  './aiProposals': { validateProposals: validate }, './aiWorkout': workout, './utils': utils,
}, { Date });

async function checkBatch() {
  const collections = {
    habit: [{ id: 'h', name: 'Meditação', category: 'Pessoal', time: '07:00', days: [1], reminderEnabled: true, done: ['2026-11-20'], created: '2026-11-10' }],
    event: [{ id: 'e', title: 'Consulta', date: '2026-11-20', time: '08:00', priority: 2, category: 'Pessoal', done: true }],
    goal: [{ id: 'g', title: 'Corrida', desc: 'Treinar', due: '', category: 'Saúde', current: 5, physicalRecords: [{ id: 'physical' }] }],
    workout: [{ id: 'w', name: 'Treino A', completedDates: ['2026-11-10'], exercises: [{ id: 's', name: 'Remada', notes: 'Costas', rest: 30, sets: [{ id: 'set', reps: 12, weight: 20 }] }] }],
    note: [{ id: 'n', title: 'Compras', content: 'Ovos', createdAt: 'start', updatedAt: 'old' }],
    finance: [{ id: 'f', description: 'Mercado', type: 'despesa', date: '2026-11-20', category: 'Outro', amount: 100 }],
    meal: [{ id: 'm', food: 'Canja', date: '2026-11-20', meal: 'Jantar', calories: 250, protein: 12, carbs: 20, fat: 7 }],
    water: [{ id: 'v', date: '2026-11-20', amount: 300 }],
  };
  const items = [
    { type: 'habit', name: '  MEDITACAO  ', action: 'update', days: [1, 5] },
    { type: 'event', name: 'Consulta', action: 'update', time: '09:00' },
    { type: 'goal', name: 'Corrida', action: 'update', description: 'Correr' },
    { type: 'workout', name: 'Treino A', action: 'update', exerciseChanges: [
      { operation: 'update', name: 'Remada', weight: 24 },
      { operation: 'add', name: 'Puxada', weight: 30 },
    ] },
    { type: 'note', name: 'Compras', action: 'update', description: 'Ovos e leite' },
    { type: 'note', name: 'Receitas', action: 'create', description: 'Canja' },
    { type: 'finance', name: 'Mercado', action: 'delete' },
    { type: 'meal', name: 'Canja', action: 'update', calories: 300 },
    { type: 'water', name: 'Agua', action: 'update', amount: 500 },
  ];
  const plan = reviewBatch(items, collections, listTargets(collections));
  assert.equal(plan.valid, true);
  assert.equal(plan.changes.size, 8);
  assert.equal(plan.previews[0].before.time, '07:00');
  assert.equal(plan.changes.get('habit')[0].reminderEnabled, true);
  assert.equal(plan.changes.get('habit')[0].done, collections.habit[0].done);
  assert.equal(plan.changes.get('event')[0].done, true);
  assert.equal(plan.changes.get('goal')[0].physicalRecords, collections.goal[0].physicalRecords);
  assert.equal(plan.changes.get('workout')[0].completedDates, collections.workout[0].completedDates);
  assert.equal(plan.changes.get('workout')[0].exercises[0].sets[0].id, 'set');
  assert.equal(plan.changes.get('workout')[0].exercises[0].sets[0].weight, 24);
  assert.equal(plan.changes.get('workout')[0].exercises[1].pendingWeight, 30);
  assert.equal(plan.changes.get('note').find(note => note.id === 'n').createdAt, 'start');
  assert.equal(plan.changes.get('finance').length, 0);
  assert.equal(plan.changes.get('meal')[0].protein, 12);
  assert.equal(plan.changes.get('water')[0].amount, 500);
  assert.equal(collections.water[0].amount, 300);

  const homonyms = { ...collections, habit: [...collections.habit, { ...collections.habit[0], id: 'h2', time: '18:00' }] };
  const review = (draft, data = collections) => reviewBatch(draft, data, listTargets(data));
  assert.match(review(items, homonyms).previews[0].error, /mesmo nome/);
  assert.equal(review([{ ...items[0], targetId: 'h2' }], homonyms).previews[0].before.time, '18:00');
  assert.match(review([{ ...items[0], name: 'Inexistente' }]).previews[0].error, /não encontrado/);
  assert.match(review([...items, items[0]]).previews.at(-1).error, /mais de uma vez/);
  assert.equal(review([...items, { ...items[5], name: 'receítas' }]).valid, false);
  assert.equal(review([...items, { type: 'note', name: 'X', action: 'create' }]).valid, false);
  assert.equal(review([{ ...items[4], targetId: 'n', expectedUpdatedAt: 'stale' }]).valid, false);

  const subscription = { endpoint: 'https://push.example/device' };
  const calls = [];
  const { syncHabitReminders } = load('src/notifications.ts', {}, {
    navigator: { serviceWorker: { ready: Promise.resolve({
      pushManager: { getSubscription: async () => subscription },
    }) } },
    fetch: async (url, options) => {
      calls.push({ url, method: options.method, body: JSON.parse(options.body) });
      return { ok: true };
    },
  });
  await syncHabitReminders(plan.changes.get('habit'));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/sync-habit-reminders');
  assert.equal(calls[0].method, 'POST');
  assert.deepEqual(calls[0].body.subscription, subscription);
  assert.deepEqual(calls[0].body.reminders, [{
    habitId: 'h', habitName: 'Meditação', time: '07:00', days: [1, 5],
  }]);
  const removed = review([{ type: 'habit', action: 'delete', name: 'Meditação' }]);
  assert.equal(removed.valid, true);
  await syncHabitReminders(removed.changes.get('habit'));
  assert.deepEqual(calls[1].body.reminders, []);
}
let modelCalls = 0;
let modelStatus = 200;
let modelUrl = '';
let modelBody;
const modelLogs = [];
let modelText = JSON.stringify({ mensagem: 'Pronto', registros: [{ type: 'event', name: 'Consulta', date: '2026-12-01' }] });
const fakeFetch = async (url, options) => { modelCalls++; modelUrl = url; modelBody = JSON.parse(options.body); return { ok: modelStatus === 200, status: modelStatus, json: async () => ({ candidates: [{ content: { parts: [{ text: modelText }] } }] }) }; };
const ai = load('api/ai.ts', { './lib/security.js': security, '../src/aiProposals.js': { validateProposals: validate } }, { process: { env }, fetch: fakeFetch, console: { error: (...args) => modelLogs.push(args) } }).default;

(async () => {
  await checkBatch();
  const base = { headers: { host: 'test.example', origin: 'https://test.example', 'x-vercel-forwarded-for': '192.0.2.1' } };
  assert.notEqual(security.loginBucket({ headers: base.headers }), security.loginBucket({ headers: { 'x-vercel-forwarded-for': '192.0.2.2' } }));
  assert.equal(security.loginBucket({ headers: {} }), null);
  let res = response();
  await auth({ ...base, method: 'POST', body: { password: 'wrong' } }, res);
  assert.equal(res.code, 401);
  res = response();
  await auth({ ...base, method: 'POST', body: { password: env.AZYRUS_PASSWORD } }, res);
  assert.equal(res.code, 200);
  const cookie = res.headers['Set-Cookie'];
  assert.match(cookie, /HttpOnly; Secure; SameSite=Strict/);
  assert.equal(security.session({ headers: { cookie } }), true);
  assert.equal(security.session({ headers: { cookie: cookie.replace(/(__Host-azyrus_session=\d+)\./, '$1.0') } }), false);
  res = response();
  await auth({ method: 'POST', headers: { ...base.headers, origin: 'https://evil.example' }, body: { password: env.AZYRUS_PASSWORD } }, res);
  assert.equal(res.code, 403);
  limitResult = false;
  res = response();
  await auth({ ...base, method: 'POST', body: { password: env.AZYRUS_PASSWORD } }, res);
  assert.equal(res.code, 429);
  limitResult = true;
  const input = { command: 'Criar evento', today: '2026-11-17' };
  res = response();
  await ai({ ...base, method: 'POST', body: input }, res);
  assert.equal(res.code, 401);
  assert.equal(modelCalls, 0);
  res = response();
  await ai({ method: 'POST', headers: { ...base.headers, cookie }, body: input }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.registros[0].name, 'Consulta');
  assert.match(modelUrl, /\/gemini-3\.5-flash-lite:generateContent$/);
  assert.equal(JSON.stringify(modelBody.generationConfig.responseSchema).includes('"required":["name","weight"]'), true);
  modelText = JSON.stringify({ mensagem: 'Séries e repetições pendentes', registros: [{ type: 'workout', name: 'Pull', day: 2, exercises: [{ name: 'Remada', weight: 60 }] }] });
  res = response();
  await ai({ method: 'POST', headers: { ...base.headers, cookie }, body: input }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.registros[0].exercises[0].weight, 60);
  assert.equal(res.body.registros[0].exercises[0].count, undefined);
  const records = [{ type: 'habit', name: 'Meditação' }, { type: 'note', name: 'Compras' }];
  modelText = JSON.stringify({ mensagem: 'Pronto', registros: [
    { type: 'habit', name: 'Meditação', action: 'update', days: [1, 3] },
    { type: 'note', name: 'Compras', action: 'delete' },
    { type: 'event', name: 'Consulta', action: 'create', date: '2026-12-01' },
  ] });
  res = response();
  await ai({ method: 'POST', headers: { ...base.headers, cookie }, body: { ...input, records } }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(JSON.parse(modelBody.contents[0].parts[0].text).registrosExistentes, records);
  assert.equal(res.body.registros.length, 3);
  modelText = JSON.stringify({ mensagem: 'Informe o horário.', pendencia: true, registros: [
    { type: 'note', name: 'Compras', action: 'delete' },
  ] });
  res = response();
  await ai({ method: 'POST', headers: { ...base.headers, cookie }, body: { ...input, records } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.registros.length, 0);
  res = response();
  await ai({ method: 'POST', headers: { ...base.headers, cookie }, body: { ...input, records: [{ ...records[1], content: 'privado' }] } }, res);
  assert.equal(res.code, 400);
  modelStatus = 403;
  res = response();
  await ai({ method: 'POST', headers: { ...base.headers, cookie }, body: input }, res);
  assert.equal(res.code, 502);
  assert.match(res.body.error, /HTTP 403/);
  assert.equal(modelLogs.at(-1)[1].status, 403);
  assert.equal(JSON.stringify(modelLogs).includes(env.GEMINI_API_KEY), false);
  modelStatus = 429;
  res = response();
  await ai({ method: 'POST', headers: { ...base.headers, cookie }, body: input }, res);
  assert.equal(res.code, 429);
  modelStatus = 200;
  modelText = JSON.stringify({ mensagem: 'ok', registros: [{ type: 'event', name: 'x', date: '2026-02-30' }] });
  res = response();
  await ai({ method: 'POST', headers: { ...base.headers, cookie }, body: input }, res);
  assert.equal(res.code, 503);
  assert.throws(() => validate([{ type: 'workout', name: 'Pull', action: 'update', exerciseChange: { operation: 'add', name: 'Remada', count: 3 } }]));
  validate([{ type: 'workout', name: 'Pull', day: 2, exercises: [{ name: 'Remada', weight: 60 }] }]);
  validate([{ type: 'workout', name: 'Pull', action: 'update', exerciseChange: { operation: 'add', name: 'Remada', weight: 60 } }]);
  assert.throws(() => validate([{ type: 'workout', name: 'Pull', day: 2, exercises: [{ name: 'Remada', weight: 60, count: -1 }] }]));
  assert.throws(() => validate([{ type: 'workout', name: 'Pull', day: 2, exercises: [{ name: 'Remada' }] }]));
  let dbTouched = false;
  const sync = load('api/sync-habit-reminders.ts', { './lib/security.js': security, './lib/supabase.js': { supabase: { from() { dbTouched = true; throw new Error('unexpected db access'); } } } }).default;
  res = response();
  await sync({ ...base, method: 'POST', body: {} }, res);
  assert.equal(res.code, 401);
  assert.equal(dbTouched, false);
  res = response();
  await sync({ method: 'POST', headers: { ...base.headers, cookie, origin: 'https://evil.example' }, body: {} }, res);
  assert.equal(res.code, 401);
  assert.equal(dbTouched, false);
  res = response();
  await sync({ method: 'POST', headers: { ...base.headers, cookie }, body: {} }, res);
  assert.equal(res.code, 400);
  console.log('OK: auth, cookie, origem, limite, autorização da IA e validação de respostas (serviços simulados).');
})().catch(error => { console.error(error); process.exitCode = 1; });
