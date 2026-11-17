import { limit, sameOrigin, session } from './lib/security.js';
import { validateProposals } from '../src/aiProposals.js';
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (!sameOrigin(req) || !session(req)) return res.status(401).json({ error: 'Sessão inválida.' });
  const { command, today } = req.body ?? {};
  if (typeof command !== 'string' || !command.trim() || command.length > 4000 || typeof today !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return res.status(400).json({ error: 'Comando ou data inválidos.' });
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'IA não configurada.' });
  const { noteContent, noteMode } = req.body ?? {};
  if (noteMode !== undefined && (!['summary', 'organize'].includes(noteMode) || typeof noteContent !== 'string' || !noteContent.trim() || noteContent.length > 12000)) return res.status(400).json({ error: 'Nota inválida ou muito longa.' });
  try {
    if (!await limit('ai', 20, 86400)) return res.status(429).json({ error: 'Limite de solicitações atingido. Tente mais tarde.' });
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: noteMode ? JSON.stringify({ systemInstruction: { parts: [{ text: noteMode === 'summary' ? 'Resuma a nota em português, sem inventar fatos. Retorne apenas JSON com a propriedade texto.' : 'Organize a nota em português, preservando as informações, sem inventar fatos. Retorne apenas JSON com a propriedade texto.' }] }, contents: [{ parts: [{ text: noteContent }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: { type: 'OBJECT', properties: { texto: { type: 'STRING' } }, required: ['texto'] }, maxOutputTokens: 4096 } }) : JSON.stringify({ systemInstruction: { parts: [{ text: `Você interpreta comandos de criação no AZYRUS. A data local é ${today}. Tipos permitidos: habit, event, finance, goal, workout, note, meal, water. Para water use name Agua, date e amount em mililitros; para excluir use name Agua e action delete. Para excluir use action delete, type e name com o nome do registro; nao inclua outros campos. Para criacao use action create. Para editar qualquer area use action update e name com o nome atual do registro. Use newName para novo nome; inclua somente campos alterados: habit category time days reminder; event category date time; finance category date amount direction; goal category date description; workout day; note description; meal date meal calories protein carbs fat; water date amount. Nao invente valores. Para editar exercicio em treino use exerciseChange com operation add, update ou remove e name do exercicio; informe somente alteracoes explicitas em newName, count, reps, weight e rest. Para add exija count, reps e weight. Para remove somente operation e name. Nunca forneca targetId; o usuario escolhe o registro no aparelho. Para nota, use name como título e description como conteúdo. Para refeição, informe date, meal, calories, protein, carbs e fat explicitamente, sem inventar. Para treino use day (domingo 0 a sábado 6) e exercises com name, count, reps e weight explícitos. Rest é opcional e representa segundos. Para dados ausentes ou ambíguos retorne registros vazios e peça esclarecimento. Use datas AAAA-MM-DD e horas HH:MM. Hábitos exigem days e reminder booleano; se reminder for true, time é obrigatório. Eventos e finanças exigem data, amount positivo e direction somente para finanças. Não invente dados.` }] }, contents: [{ parts: [{ text: command.trim() }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: { type: 'OBJECT', properties: { mensagem: { type: 'STRING' }, registros: { type: 'ARRAY', items: { type: 'OBJECT', properties: { type: { type: 'STRING', enum: ['habit','event','finance','goal','workout','note','meal','water'] }, action: { type: 'STRING', enum: ['create','delete','update'] }, name: { type: 'STRING' }, newName: { type: 'STRING' }, date: { type: 'STRING' }, time: { type: 'STRING' }, days: { type: 'ARRAY', items: { type: 'INTEGER' } }, reminder: { type: 'BOOLEAN' }, amount: { type: 'NUMBER' }, direction: { type: 'STRING', enum: ['receita','despesa'] }, category: { type: 'STRING' }, description: { type: 'STRING' }, meal: { type: 'STRING', enum: ['Café da manhã','Almoço','Lanche','Jantar','Outro'] }, calories: { type: 'NUMBER' }, protein: { type: 'NUMBER' }, carbs: { type: 'NUMBER' }, fat: { type: 'NUMBER' }, day: { type: 'INTEGER' }, exerciseChange: { type: 'OBJECT', properties: { operation: {type:'STRING', enum:['add','update','remove']}, name: {type:'STRING'}, newName:{type:'STRING'}, count:{type:'INTEGER'}, reps:{type:'INTEGER'}, weight:{type:'NUMBER'}, rest:{type:'INTEGER'} }, required:['operation','name'] }, exercises: { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: {type:'STRING'}, count: {type:'INTEGER'}, reps: {type:'INTEGER'}, weight:{type:'NUMBER'}, rest:{type:'INTEGER'} }, required: ['name','count','reps','weight'] } } }, required: ['type','name'] } } }, required: ['mensagem','registros'] }, maxOutputTokens: 2048 } }), signal: AbortSignal.timeout(25000)
    });
    if (!response.ok) {
      // Do not log the upstream body: it can contain request or credential details.
      console.error('Gemini retornou erro HTTP', { status: response.status, model: 'gemini-3.5-flash-lite' });
      if (response.status === 429) return res.status(429).json({ error: 'Limite do Gemini atingido. Tente mais tarde.' });
      return res.status(502).json({ error: `Não foi possível consultar o Gemini (HTTP ${response.status}). Verifique a chave e o acesso ao modelo.` });
    }
    const result: any = await response.json();
    const parsed = JSON.parse(result?.candidates?.[0]?.content?.parts?.[0]?.text);
    if (noteMode) {
      if (typeof parsed?.texto !== 'string' || !parsed.texto.trim() || parsed.texto.length > 12000) throw new Error('Invalid note output');
      return res.status(200).json({ texto: parsed.texto });
    }
    if (typeof parsed?.mensagem !== 'string' || parsed.mensagem.length > 4000 || !Array.isArray(parsed.registros)) throw new Error('Invalid output');
    if (parsed.registros.length) validateProposals(parsed.registros);
    return res.status(200).json({ mensagem: parsed.mensagem, registros: parsed.registros });
  } catch { return res.status(503).json({ error: 'Não foi possível validar a interpretação. Esclareça os dados e tente novamente.' }); }
}
