// Offline checks: no environment files, network, Supabase, or real credentials.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

function load(path, dependencies, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
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
let modelCalls = 0;
let modelText = JSON.stringify({ mensagem: 'Pronto', registros: [{ type: 'event', name: 'Consulta', date: '2026-12-01' }] });
const fakeFetch = async () => { modelCalls++; return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: modelText }] } }] }) }; };
const ai = load('api/ai.ts', { './lib/security.js': security, '../src/aiProposals.js': { validateProposals: validate } }, { process: { env }, fetch: fakeFetch }).default;

(async () => {
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
  modelText = JSON.stringify({ mensagem: 'ok', registros: [{ type: 'event', name: 'x', date: '2026-02-30' }] });
  res = response();
  await ai({ method: 'POST', headers: { ...base.headers, cookie }, body: input }, res);
  assert.equal(res.code, 503);
  assert.throws(() => validate([{ type: 'workout', name: 'Pull', action: 'update', exerciseChange: { operation: 'add', name: 'Remada', count: 3 } }]));
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
