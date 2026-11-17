const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

let attempts = 0;
let abort = false;
const records = new Map([['habits', [{ name: 'Leitura' }]]]);
const database = {
  transaction(key, mode) {
    const transaction = { error: null, objectStore() { return {
      get(k) { const request = {}; queueMicrotask(() => { request.result = records.get(k); request.onsuccess(); }); return request; },
      put(value, k) { queueMicrotask(() => { if (abort) { transaction.error = new Error('abort'); transaction.onabort(); } else { records.set(k, value); transaction.oncomplete(); } }); }
    }; } };
    assert.equal(key, 'kv');
    assert.ok(mode === undefined || mode === 'readwrite');
    return transaction;
  }, close() {}
};
const indexedDB = { open() {
  const request = {};
  queueMicrotask(() => {
    attempts++;
    if (attempts === 1) { request.error = new Error('unavailable'); request.onerror(); }
    else { request.result = database; request.onsuccess(); }
  });
  return request;
} };
const source = ts.transpileModule(fs.readFileSync('src/db.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {}, indexedDB, Promise, Error };
vm.runInNewContext(source, context);
(async () => {
  await assert.rejects(context.exports.dbGet('habits'));
  assert.equal((await context.exports.dbGet('habits'))[0].name, 'Leitura');
  abort = true;
  await assert.rejects(context.exports.dbSet('habits', []));
  assert.equal(records.get('habits')[0].name, 'Leitura');
  abort = false;
  await context.exports.dbSet('habits', [{ name: 'Treino' }]);
  assert.equal(records.get('habits')[0].name, 'Treino');
  console.log('OK: falha de abertura, nova tentativa, transação abortada e gravação (IndexedDB simulado).');
})().catch(error => { console.error(error); process.exitCode = 1; });
