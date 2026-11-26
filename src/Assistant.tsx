import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, LoaderCircle, Mic, Square } from 'lucide-react';
import { Btn, Field, Sel, Sheet } from './ui';
import { validateProposals } from './aiProposals';
import type { Proposal } from './aiProposals';
import { catalogForCommand, categoryLabels, deletionDetails, describeRecord, matchingTargets, reviewBatch, type AICollections, type AIReview, type AITarget } from './aiBatch';
import { DOW, today } from './utils';

type SpeechInstance = { lang: string; onresult: ((event: any) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechInstance; webkitSpeechRecognition?: new () => SpeechInstance };
type ProposalIssue = { registro: string; motivo: string };
export default function Assistant({ onClose, onConfirm, targets, collections }: {
  onClose: () => void;
  onConfirm: (review: AIReview) => Promise<void>;
  targets: AITarget[];
  collections: AICollections;
}) {
  const [command, setCommand] = useState('');
  const [result, setResult] = useState('');
  const [draft, setDraft] = useState<Proposal[]>([]);
  const [issues, setIssues] = useState<ProposalIssue[]>([]);
  const [revision, setRevision] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [noteId, setNoteId] = useState('');
  const [saving, setSaving] = useState(false);
  const committing = useRef(false);
  const review = useMemo(() => reviewBatch(draft, collections, targets), [draft, collections, targets]);
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
    if (busy || committing.current || !command.trim()) return;
    setBusy(true); setError('');
    if (revision === null) { setResult(''); setDraft([]); setIssues([]); }
    try {
      const description = revision === null ? command
        : `Revise apenas a alteração pendente para “${issues[revision].registro}”. Correção: ${command}`;
      const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: description, today: today(), records: catalogForCommand(targets) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao processar comando.');
      setResult(data.mensagem || 'Confira os dados identificados.');
      const proposals = data.registros?.length ? validateProposals(data.registros) : [];
      const pending: ProposalIssue[] = data.pendencias ?? [];
      if (revision === null) {
        setDraft(proposals);
        setIssues(pending);
      } else if (proposals.length || pending.length) {
        if (draft.length + issues.length - 1 + proposals.length + pending.length > 100) throw new Error('O lote aceita até 100 alterações e pendências.');
        setDraft([...draft, ...proposals]);
        setIssues(issues.flatMap((issue, index) => index === revision ? pending : [issue]));
        setRevision(null);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro de conexão.'); }
    finally { setBusy(false); }
  };
  const transformNote = async (mode: 'summary' | 'organize') => {
    if (busy || committing.current || !noteId) return;
    setBusy(true); setError(''); setResult(''); setDraft([]); setIssues([]); setRevision(null);
    try {
      const selected = collections.note.find(note => note.id === noteId);
      if (!selected) throw new Error('Nota não encontrada.');
      const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: mode === 'summary' ? 'Resumir nota' : 'Organizar nota', today: today(), noteMode: mode, noteContent: selected.content }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível processar a nota.');
      setDraft(validateProposals([{ type: 'note', action: 'update', name: selected.title, targetId: selected.id, expectedUpdatedAt: selected.updatedAt, description: data.texto }]));
      setResult('Confira o texto sugerido. A nota só será alterada após sua confirmação.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível processar a nota.'); }
    finally { setBusy(false); }
  };
  const confirm = async () => {
    if (committing.current || busy || issues.length || !review.valid) return;
    committing.current = true;
    setSaving(true);
    setError('');
    try {
      await onConfirm(review);
      setDraft([]);
      setResult('Alterações confirmadas.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Falha no salvamento. Nenhuma alteração do lote foi aplicada.');
    } finally {
      committing.current = false;
      setSaving(false);
    }
  };

  return <Sheet title="AZYRUS AI" onClose={() => { if (!committing.current) onClose(); }}>
    <label className="block text-sm text-mu mb-2" htmlFor="ai-command">{revision === null ? 'O que deseja organizar?' : `Descreva apenas a correção para ${issues[revision].registro}`}</label>
    <div className="rounded-xl border border-ln bg-bg p-2 focus-within:border-ac">
      <textarea id="ai-command" className="block w-full resize-y rounded-lg bg-transparent p-2 text-tx" rows={3} maxLength={revision === null ? 4000 : 3700} value={command} onChange={e => setCommand(e.target.value)} placeholder="Digite seu comando" />
      <div className="mt-2 flex items-center justify-end gap-2">
        {busy && <span className="mr-auto text-sm text-mu" role="status">Processando…</span>}
        {Speech && <Btn variant="ghost" onClick={listen} aria-pressed={recording} aria-label={recording ? 'Parar gravação' : 'Falar comando'}>{recording ? <Square size={16} /> : <Mic size={18} />}</Btn>}
        <Btn onClick={send} disabled={saving || busy || !command.trim()} aria-label="Enviar comando">{busy ? <LoaderCircle size={18} className="motion-safe:animate-spin" /> : <ArrowUp size={20} />}</Btn>
      </div>
    </div>
    <p className="mt-2 text-xs text-mu">Os nomes e tipos dos registros acompanham o comando enviado à IA.</p>
    {!Speech && <p className="text-xs text-mu mt-2">Reconhecimento de voz indisponível neste navegador. Use o texto.</p>}
    {targets.some(target => target.type === 'note') && <details className="mt-4 rounded-xl border border-ln p-3"><summary className="cursor-pointer text-sm text-ac">Resumir ou organizar uma nota</summary><div className="mt-3"><Sel label="Nota" value={noteId} onChange={e => setNoteId(e.target.value)}><option value="">Selecione uma nota</option>{targets.filter(target => target.type === 'note').map(target => <option key={target.id} value={target.id}>{target.name} — {target.detail}</option>)}</Sel><p className="text-xs text-mu mb-3">O conteúdo da nota selecionada será enviado ao Gemini.</p><div className="flex gap-2"><Btn variant="ghost" className="flex-1" disabled={saving || !noteId || busy} onClick={() => transformNote('summary')}>Resumir</Btn><Btn variant="ghost" className="flex-1" disabled={saving || !noteId || busy} onClick={() => transformNote('organize')}>Organizar</Btn></div></div></details>}
    {error && <p role="alert" className="form-error mt-3 text-sm">{error}</p>}
    {result && <div className="mt-4"><p className="font-medium">Interpretação</p><p className="whitespace-pre-wrap text-sm text-mu mt-2">{result}</p></div>}
    {issues.length > 0 && <section className="mt-4 space-y-2" aria-label="Pendências">
      {issues.map((issue, index) => <div key={index} className="rounded-xl border border-ln p-3">
        <p className="font-medium">{issue.registro}</p>
        <p className="text-sm text-mu">{issue.motivo}</p>
        <div className="mt-2 flex gap-2">
          <Btn variant="ghost" disabled={busy || revision === index} onClick={() => {
            setRevision(index);
            setCommand('');
            document.getElementById('ai-command')?.focus();
          }}>Revisar</Btn>
          <Btn variant="ghost" disabled={busy} onClick={() => {
            setIssues(current => current.filter((_, position) => position !== index));
            if (revision === index) { setRevision(null); setCommand(''); }
            else if (revision !== null && revision > index) setRevision(revision - 1);
          }}>Remover pendência</Btn>
        </div>
      </div>)}
    </section>}
    {draft.length > 0 && <h3 className="mt-5 font-semibold">Prévia das alterações</h3>}
    {draft.map((item, index) => {
      const change = (patch: Partial<Proposal>) => setDraft(current => current.map((p, i) => i === index ? { ...p, ...patch } : p));
      const number = (value: string) => value === '' ? undefined : Number(value);
      const matches = matchingTargets(item, targets);
      const preview = review.previews[index];
      const editing = item.action === 'update';
      const deleting = item.action === 'delete';
      const current: Record<string, string | number | undefined> = preview.before
        ? { ...describeRecord(preview.before), ...(deleting ? deletionDetails(preview.before) : {}) }
        : {};
      const next: Record<string, string | number> = preview.after ? describeRecord(preview.after) : {};
      const fields = Object.keys(preview.after ? next : current).filter(key => !editing || current[key] !== next[key]);
      return <fieldset disabled={saving || busy} key={index} className="mt-3 min-w-0 rounded-xl border border-ln bg-bg/50 p-4">
        <p className="font-medium mb-3">{deleting ? 'Excluir' : editing ? 'Editar' : 'Criar'} · {categoryLabels[item.type]} · {item.name}</p>
        {preview.error && <p role="alert" className="form-error mb-3 text-sm">{preview.error}</p>}
        {fields.length > 0 && <div className="mb-4 space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2 font-medium"><span>Atual</span><span>Novo</span></div>
          <dl className="space-y-2">{fields.map(field => <div key={field}>
            <dt className="text-mu">{field}</dt>
            <dd className="grid grid-cols-2 gap-2 whitespace-pre-wrap break-words">
              <span>{current[field] === '' ? 'Sem valor' : current[field] ?? '—'}</span>
              <span>{next[field] === '' ? 'Sem valor' : next[field] ?? (deleting ? 'Removido' : '—')}</span>
            </dd>
          </div>)}</dl>
        </div>}
        {!preview.error && editing && fields.length === 0 && <p className="mb-3 text-sm text-mu">Os valores propostos já são os atuais.</p>}
        {deleting || editing ? <>
          {matches.length > 1 && <Sel label="Qual registro?" value={item.targetId || ''} onChange={e => change({ targetId: e.target.value || undefined })}>
            <option value="">Selecione um registro</option>
            {matches.map(target => <option key={target.id} value={target.id}>{target.name}{target.detail ? ` · ${target.detail}` : ''}</option>)}
          </Sel>}
          {editing && <>
          {item.newName !== undefined && <Field label="Novo nome" value={item.newName} onChange={e => change({newName:e.target.value})} />}
          {item.date !== undefined && <Field label="Nova data" type="date" value={item.date} onChange={e => change({date:e.target.value})} />}
          {(item.time !== undefined || item.type === 'habit') && <Field label={item.type === 'habit' ? 'Horário padrão' : 'Novo horário'} type="time" value={item.time ?? (preview.before && 'days' in preview.before ? preview.before.time : '')} onChange={e => change({time:e.target.value})} />}
          {item.category !== undefined && <Field label="Nova categoria" value={item.category} onChange={e => change({category:e.target.value})} />}
          {item.description !== undefined && <label className="block mb-3 text-sm text-mu">Novo texto<textarea className="mt-1 w-full rounded-xl bg-bg border border-ln p-3 text-tx" rows={5} value={item.description} onChange={e => change({description:e.target.value})} /></label>}
          {(['amount','calories','protein','carbs','fat'] as const).map(key => item[key] !== undefined && <Field key={key} label={({amount:item.type === 'water' ? 'Volume (ml)' : 'Valor',calories:'Calorias',protein:'Proteína',carbs:'Carboidratos',fat:'Gorduras'})[key]} type="number" min="0" step="0.01" value={item[key]} onChange={e => change({[key]:number(e.target.value) ?? NaN})} />)}
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
        {['event', 'habit'].includes(item.type) && <Field label={item.type === 'habit' ? 'Horário padrão' : 'Horário'} type="time" value={item.time || ''} onChange={e => change({ time: e.target.value })} />}
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
        {item.type === 'habit' && !deleting && <details className="mb-3 rounded-xl border border-ln p-3">
          <summary className="cursor-pointer text-sm">Horários por dia na proposta</summary>
          {DOW.map((day, weekday) => {
            const slot = item.dayTimes?.find(entry => entry.days.includes(weekday));
            const setSlot = (time: string | null | undefined) => {
              const others = (item.dayTimes ?? []).map(entry => ({ ...entry, days: entry.days.filter(value => value !== weekday) })).filter(entry => entry.days.length);
              if (time !== undefined) others.push({ days: [weekday], time });
              // Coalesce equal times so a full week always fits the allowed number of slots.
              const groups = new Map<string | null, number[]>();
              for (const entry of others) groups.set(entry.time, [...(groups.get(entry.time) ?? []), ...entry.days]);
              change({ dayTimes: groups.size ? Array.from(groups, ([time, days]) => ({ time, days })) : undefined });
            };
            return <div key={day} className="mt-2">
              <Field label={slot?.time === null ? `${day} · usar padrão` : day} type="time" value={slot?.time ?? ''} onChange={e => setSlot(e.target.value || undefined)} />
              {editing && <button type="button" className="mr-3 text-xs text-ac" onClick={() => setSlot(null)}>Usar padrão</button>}
              {slot && <button type="button" className="text-xs text-mu underline" onClick={() => setSlot(undefined)}>Remover horário da proposta</button>}
            </div>;
          })}
        </details>}
        <button type="button" className="text-sm text-mu underline" onClick={() => setDraft(current => current.filter((_, i) => i !== index))}>Remover da prévia</button>
      </fieldset>;
    })}
    {draft.length > 0 && <div className="flex gap-2 mt-4">
      <Btn className="flex-1" disabled={saving || busy || !!issues.length || !review.valid} onClick={confirm}>{saving ? 'Salvando…' : `Confirmar todas (${draft.length})`}</Btn>
      <Btn variant="ghost" disabled={saving || busy} onClick={() => { setDraft([]); setIssues([]); setRevision(null); setError(''); setResult('Alterações canceladas.'); }}>Cancelar</Btn>
    </div>}
  </Sheet>;
}
