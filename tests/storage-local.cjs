const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

let attempts = 0;
let abort = false;
let failKey;
const records = new Map([['habits', [{ name: 'Leitura' }]]]);
const database = {
  transaction(key, mode) {
    const pending = [];
    const writes = new Map();
    let stopped = false;
    const store = {
      get(k) {
        const request = {};
        pending.push(() => { request.result = records.get(k); request.onsuccess(); });
        return request;
      },
      put(value, k) {
        pending.push(() => {
          if (abort || k === failKey) {
            transaction.error = new Error('abort');
            transaction.abort();
          } else {
            writes.set(k, value);
          }
        });
      },
    };
    const transaction = {
      error: null,
      objectStore: () => store,
      abort() { stopped = true; this.onabort(); },
    };
    queueMicrotask(() => {
      while (!stopped && pending.length) pending.shift()();
      if (stopped) return;
      writes.forEach((value, k) => records.set(k, value));
      transaction.oncomplete?.();
    });
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
const legacyNotes = [
  { id: 'a', title: 'Primeira 📝', content: 'Linha 1\nLinha 2', createdAt: '2025-01-01', updatedAt: '2026-10-01', extra: { tags: ['trabalho'] } },
  { id: 'b', title: 'Segunda', content: '', createdAt: '2024-01-01', updatedAt: '2026-10-02' },
];
const legacyRaw = JSON.stringify(legacyNotes);
const notesContext = { exports: {}, localStorage: { getItem: key => {
  assert.equal(key, 'azyrus-notes-v1');
  return legacyRaw;
} } };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/notes.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, notesContext);
(async () => {
  await assert.rejects(context.exports.dbGet('habits'));
  assert.equal((await context.exports.dbGet('habits'))[0].name, 'Leitura');
  const firstWrite = [{ key: 'habits', before: [{ name: 'Leitura' }], after: [{ name: 'Treino' }] }];
  abort = true;
  await assert.rejects(context.exports.dbCommitBatch(firstWrite));
  assert.equal(records.get('habits')[0].name, 'Leitura');
  abort = false;
  await context.exports.dbCommitBatch(firstWrite);
  assert.equal(records.get('habits')[0].name, 'Treino');
  assert.equal(await context.exports.dbGet('notes'), undefined);
  const loaded = notesContext.exports.loadPreviousNotes();
  assert.equal(JSON.stringify(loaded), legacyRaw);
  const nextNotes = [...loaded, { id: 'new', title: 'Nova', content: 'Texto', createdAt: '2026-11-26', updatedAt: '2026-11-26' }];
  const writes = [
    { key: 'habits', before: [{ name: 'Treino' }], after: [{ name: 'Corrida' }] },
    { key: 'notes', before: undefined, after: nextNotes },
  ];
  failKey = 'notes';
  await assert.rejects(context.exports.dbCommitBatch(writes));
  assert.equal(records.get('habits')[0].name, 'Treino');
  assert.equal(records.has('notes'), false);
  failKey = undefined;
  await assert.rejects(context.exports.dbCommitBatch([writes[0], { ...writes[1], before: [] }]), /dados mudaram/);
  assert.equal(records.get('habits')[0].name, 'Treino');
  await context.exports.dbCommitBatch(writes);
  assert.equal(records.get('habits')[0].name, 'Corrida');
  assert.equal(JSON.stringify((await context.exports.dbGet('notes')).slice(0, 2)), legacyRaw);
  assert.equal((await context.exports.dbGet('notes'))[2].title, 'Nova');
  assert.equal(JSON.stringify(notesContext.exports.loadPreviousNotes()), legacyRaw);
  await assert.rejects(context.exports.dbCommitBatch(writes), /dados mudaram/);
  console.log('OK: nova tentativa, lote atômico, falha de escrita e conflito (IndexedDB simulado).');
})().catch(error => { console.error(error); process.exitCode = 1; });
