import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { Btn, Field, Sel, Sheet } from './ui';
import { validateProposals } from './aiProposals';
import type { Proposal } from './aiProposals';
import { today } from './utils';

type SpeechInstance = { lang: string; onresult: ((event: any) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechInstance; webkitSpeechRecognition?: new () => SpeechInstance };
export type AITarget = { type: Proposal['type']; id: string; name: string; detail: string };
export default function Assistant({ onClose, onConfirm, targets }: { onClose: () => void; onConfirm: (items: Proposal[]) => void; targets: AITarget[] }) {
  const [command, setCommand] = useState('');
  const [result, setResult] = useState('');
  const [draft, setDraft] = useState<Proposal[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [noteId, setNoteId] = useState('');
  const speech = useRef<SpeechInstance | null>(null);
  const Speech = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
  useEffect(() => () => { speech.current?.stop(); }, []);
  const listen = () => {
    if (recording) { speech.current?.stop(); return; }
    if (!Speech) return;
    try {
      const recognition = new Speech(); speech.current = recognition; recognition.lang = 'pt-BR';
      recognition.onresult = event => setCommand(previous => `${previous}${previous ? ' ' : ''}${event.results[0][0].transcript}`);
      recognition.onerror = () => { setRecording(false); setError('Não foi possível reconhecer a voz. Você pode digitar.'); };
      recognition.onend = () => setRecording(false);
      recognition.start(); setRecording(true); setError('');
    } catch { setError('Não foi possível iniciar o microfone.'); }
  };
  const send = async () => {
    if (busy || !command.trim()) return;
    setBusy(true); setError(''); setResult(''); setDraft([]);
    try {
      const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command, today: today() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao processar comando.');
      setResult(data.mensagem || 'Confira os dados identificados.');
      if (data.registros?.length) setDraft(validateProposals(data.registros));
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro de conexão.'); }
    finally { setBusy(false); }
  };
  const transformNote = async (mode: 'summary' | 'organize') => {
    if (busy || !noteId) return;
    setBusy(true); setError(''); setResult(''); setDraft([]);
    try {
      const notes: unknown = JSON.parse(localStorage.getItem('azyrus-notes-v1') || '[]');
      const selected = Array.isArray(notes) ? notes.find(n => n?.id === noteId) : undefined;
      if (!selected || typeof selected.title !== 'string' || typeof selected.content !== 'string' || typeof selected.updatedAt !== 'string') throw new Error('Nota não encontrada.');
      const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: mode === 'summary' ? 'Resumir nota' : 'Organizar nota', today: today(), noteMode: mode, noteContent: selected.content }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível processar a nota.');
      setDraft(validateProposals([{ type: 'note', action: 'update', name: selected.title, targetId: selected.id, expectedUpdatedAt: selected.updatedAt, description: data.texto }]));
      setResult('Confira o texto sugerido. A nota só será alterada após sua confirmação.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível processar a nota.'); }
    finally { setBusy(false); }
  };
  return <Sheet title="AZYRUS AI" onClose={onClose}>
    <label className="block text-sm text-mu mb-2" htmlFor="ai-command">O que deseja organizar?</label>
    <textarea id="ai-command" className="w-full rounded-xl border border-ln bg-bg p-3 text-tx" rows={4} maxLength={4000} value={command} onChange={e => setCommand(e.target.value)} placeholder="Digite ou fale seu comando" />
    <div className="flex gap-2 mt-3">
      <Btn onClick={send} disabled={busy || !command.trim()} className="flex-1">{busy ? 'Processando...' : 'Interpretar'}</Btn>
      {Speech && <Btn variant="ghost" onClick={listen} aria-label={recording ? 'Parar gravação' : 'Falar comando'}><Mic size={20} />{recording ? 'Parar' : 'Falar'}</Btn>}
    </div>
    {!Speech && <p className="text-xs text-mu mt-2">Reconhecimento de voz indisponível neste navegador. Use o texto.</p>}
    {targets.some(target => target.type === 'note') && <details className="mt-4 rounded-xl border border-ln p-3"><summary className="cursor-pointer text-sm text-ac">Resumir ou organizar uma nota</summary><div className="mt-3"><Sel label="Nota" value={noteId} onChange={e => setNoteId(e.target.value)}><option value="">Selecione uma nota</option>{targets.filter(target => target.type === 'note').map(target => <option key={target.id} value={target.id}>{target.name} — {target.detail}</option>)}</Sel><p className="text-xs text-mu mb-3">O conteúdo da nota selecionada será enviado ao Gemini.</p><div className="flex gap-2"><Btn variant="ghost" className="flex-1" disabled={!noteId || busy} onClick={() => transformNote('summary')}>Resumir</Btn><Btn variant="ghost" className="flex-1" disabled={!noteId || busy} onClick={() => transformNote('organize')}>Organizar</Btn></div></div></details>}
    {error && <p role="alert" className="text-sm text-red-400 mt-3">{error}</p>}
    {result && <div className="mt-4"><p className="font-medium">Interpretação</p><p className="whitespace-pre-wrap text-sm text-mu mt-2">{result}</p></div>}
    {draft.map((item, index) => {
      const change = (patch: Partial<Proposal>) => setDraft(current => current.map((p, i) => i === index ? { ...p, ...patch } : p));
      const number = (value: string) => value === '' ? undefined : Number(value);
      const normalize = (text: string) => text.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const matches = targets.filter(target => target.type === item.type && normalize(target.name).includes(normalize(item.name)));
      return <div key={index} className="mt-4 rounded-xl border border-ln p-4">
        <p className="font-medium mb-3">{({ habit: 'Hábito', event: 'Evento', finance: 'Finanças', goal: 'Meta', workout: 'Treino', note: 'Nota', meal: 'Refeição', water: 'Água' })[item.type]}</p>
        {item.action === 'delete' || item.action === 'update' ? <><p className="text-sm mb-2">Selecione o registro. A alteração só ocorrerá ao confirmar.</p><Sel label="Registro" value={item.targetId || ''} onChange={e => change({ targetId: e.target.value || undefined })}><option value="">Selecione um registro</option>{matches.map(target => <option key={target.id} value={target.id}>{target.name}{target.detail ? ` — ${target.detail}` : ''}</option>)}</Sel>{matches.length === 0 && <p className="text-sm text-mu">Nenhum registro encontrado. Reformule o comando com o nome exato.</p>}{item.action === 'update' && <>
          {item.newName !== undefined && <Field label="Novo nome" value={item.newName} onChange={e => change({newName:e.target.value})} />}
          {item.date !== undefined && <Field label="Nova data" type="date" value={item.date} onChange={e => change({date:e.target.value})} />}
          {item.time !== undefined && <Field label="Novo horário" type="time" value={item.time} onChange={e => change({time:e.target.value})} />}
          {item.category !== undefined && <Field label="Nova categoria" value={item.category} onChange={e => change({category:e.target.value})} />}
          {item.description !== undefined && <label className="block mb-3 text-sm text-mu">Novo texto<textarea className="mt-1 w-full rounded-xl bg-bg border border-ln p-3 text-tx" rows={5} value={item.description} onChange={e => change({description:e.target.value})} /></label>}
          {(['amount','calories','protein','carbs','fat'] as const).map(key => item[key] !== undefined && <Field key={key} label={({amount:item.type === 'water' ? 'Volume (ml)' : 'Valor',calories:'Calorias',protein:'Proteína',carbs:'Carboidratos',fat:'Gorduras'})[key]} type="number" min="0" step="0.01" value={item[key]} onChange={e => change({[key]:number(e.target.value)})} />)}
          {item.direction !== undefined && <Sel label="Tipo" value={item.direction} onChange={e => change({direction:e.target.value as 'receita'|'despesa'})}><option value="receita">Receita</option><option value="despesa">Despesa</option></Sel>}
          {item.meal !== undefined && <Sel label="Refeição" value={item.meal} onChange={e => change({meal:e.target.value})}>{['Café da manhã','Almoço','Lanche','Jantar','Outro'].map(x => <option key={x}>{x}</option>)}</Sel>}
          {item.day !== undefined && <Sel label="Dia do treino" value={item.day} onChange={e => change({day:Number(e.target.value)})}>{['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'].map((x,i) => <option key={x} value={i}>{x}</option>)}</Sel>}
          {item.exerciseChange && <div className="rounded-xl bg-bg border border-ln p-3 mb-3"><p className="mb-2 font-medium">{({add:'Adicionar exercício', update:'Alterar exercício', remove:'Remover exercício'})[item.exerciseChange.operation]}</p><Field label="Exercício" value={item.exerciseChange.name} onChange={e => change({exerciseChange:{...item.exerciseChange!,name:e.target.value}})} />{item.exerciseChange.newName !== undefined && <Field label="Novo nome" value={item.exerciseChange.newName} onChange={e => change({exerciseChange:{...item.exerciseChange!,newName:e.target.value}})} />}{(['count','reps','weight','rest'] as const).map(key => (item.exerciseChange?.operation === 'add' || item.exerciseChange?.[key] !== undefined) && <Field key={key} label={({count:'Séries',reps:'Repetições',weight:'Carga (kg)',rest:'Descanso (s)'})[key]} type="number" min="0" step={key === 'weight' ? '0.5' : '1'} placeholder={key === 'weight' ? '' : 'Pendente'} value={item.exerciseChange?.[key] ?? ''} onChange={e => change({exerciseChange:{...item.exerciseChange!,[key]:number(e.target.value)}})} />)}</div>}
          {item.days !== undefined && <div className="flex flex-wrap gap-1 mb-3">{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((x,i) => <button type="button" key={x} aria-pressed={item.days!.includes(i)} className={`rounded-lg px-2 py-2 text-sm border border-ln ${item.days!.includes(i) ? 'bg-ac text-on' : ''}`} onClick={() => change({days:item.days!.includes(i) ? item.days!.filter(d => d !== i) : [...item.days!,i]})}>{x}</button>)}</div>}
          {item.reminder !== undefined && <label className="flex gap-2 mb-3"><input type="checkbox" checked={item.reminder} onChange={e => change({reminder:e.target.checked})} />Lembrete</label>}
        </>}</> : <>
        <Field label="Nome" value={item.name} onChange={e => change({ name: e.target.value })} />
        {['event', 'finance', 'goal', 'meal', 'water'].includes(item.type) && <Field label="Data" type="date" value={item.date || ''} onChange={e => change({ date: e.target.value })} />}
        {item.type === 'water' && <Field label="Volume (ml)" type="number" min="1" value={item.amount ?? ''} onChange={e => change({ amount: number(e.target.value) })} />}
        {['event', 'habit'].includes(item.type) && <Field label="Horário" type="time" value={item.time || ''} onChange={e => change({ time: e.target.value })} />}
        {['habit', 'event', 'finance', 'goal'].includes(item.type) && <Field label="Categoria" value={item.category || ''} onChange={e => change({ category: e.target.value })} />}
        {['goal', 'note'].includes(item.type) && <Field label={item.type === 'note' ? 'Conteúdo' : 'Descrição'} value={item.description || ''} onChange={e => change({ description: e.target.value })} />}
        {item.type === 'meal' && <><Sel label="Refeição" value={item.meal || ''} onChange={e => change({ meal: e.target.value })}>{['Café da manhã', 'Almoço', 'Lanche', 'Jantar', 'Outro'].map(x => <option key={x}>{x}</option>)}</Sel><div className="grid grid-cols-2 gap-2">{([['calories','Calorias (kcal)'],['protein','Proteína (g)'],['carbs','Carboidratos (g)'],['fat','Gordura (g)']] as const).map(([key, label]) => <Field key={key} label={label} type="number" min="0" step="0.1" value={item[key] ?? ''} onChange={e => change({ [key]: number(e.target.value) })} />)}</div></>}
        {item.type === 'habit' && <><div className="flex gap-1 flex-wrap mb-3">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, d) => <button type="button" key={day} aria-pressed={item.days?.includes(d)} className={`rounded-lg px-2 py-2 text-sm border border-ln ${item.days?.includes(d) ? 'bg-ac text-on' : ''}`} onClick={() => change({ days: item.days?.includes(d) ? item.days.filter(x => x !== d) : [...(item.days || []), d] })}>{day}</button>)}</div><label className="flex gap-2 mb-3"><input type="checkbox" checked={!!item.reminder} onChange={e => change({ reminder: e.target.checked })} />Lembrete</label></>}
        {item.type === 'finance' && <><Sel label="Tipo" value={item.direction || ''} onChange={e => change({ direction: e.target.value as 'receita' | 'despesa' })}><option value="receita">Receita</option><option value="despesa">Despesa</option></Sel><Field label="Valor" type="number" min="0" step="0.01" value={item.amount ?? ''} onChange={e => change({ amount: number(e.target.value) })} /></>}
        {item.type === 'workout' && <><Sel label="Dia da semana" value={item.day ?? ''} onChange={e => change({ day: Number(e.target.value) })}>{['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'].map((d, i) => <option key={d} value={i}>{d}</option>)}</Sel>{item.exercises?.map((exercise, exerciseIndex) => {
          const update = (patch: Partial<typeof exercise>) => change({ exercises: item.exercises!.map((x, i) => i === exerciseIndex ? { ...x, ...patch } : x) });
          return <div key={exerciseIndex} className="rounded-xl bg-bg border border-ln p-3 mb-3"><Field label="Exercício" value={exercise.name} onChange={e => update({ name: e.target.value })} /><div className="grid grid-cols-2 gap-2"><Field label="Séries" type="number" min="1" placeholder="Pendente" value={exercise.count ?? ''} onChange={e => update({ count: number(e.target.value) })} /><Field label="Repetições" type="number" min="1" placeholder="Pendente" value={exercise.reps ?? ''} onChange={e => update({ reps: number(e.target.value) })} /><Field label="Carga (kg)" type="number" min="0" step="0.5" value={Number.isNaN(exercise.weight) ? '' : exercise.weight} onChange={e => update({ weight: e.target.value === '' ? NaN : Number(e.target.value) })} /><Field label="Descanso (s)" type="number" min="0" placeholder="Pendente" value={exercise.rest ?? ''} onChange={e => update({ rest: number(e.target.value) })} /></div></div>;
        })}</>}
        </>}
        <button type="button" className="text-sm text-mu underline" onClick={() => setDraft(current => current.filter((_, i) => i !== index))}>Remover da prévia</button>
      </div>;
    })}
    {draft.length > 0 && <div className="flex gap-2 mt-4"><Btn className="flex-1" onClick={() => { try { if (draft.some(item => (item.action === 'delete' || item.action === 'update') && !item.targetId)) throw new Error('Selecione cada registro que deseja alterar.'); onConfirm(validateProposals(draft)); setDraft([]); setError(''); setResult('Alterações confirmadas.'); } catch (e) { setError(e instanceof Error ? e.message : 'Dados inválidos.'); } }}>Confirmar</Btn><Btn variant="ghost" onClick={() => { setDraft([]); setResult('Alterações canceladas.'); }}>Cancelar</Btn></div>}
  </Sheet>;
}
