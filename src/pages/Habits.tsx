import { useState } from 'react';
import { Flame, Plus, Trash2 } from 'lucide-react';
import type { Habit, Setter } from '../types';
import { Btn, Card, CheckBtn, Empty, Field, Head, Sel, Sheet, cx } from '../ui';
import { addDays, DOW, due, freq, iso, MILESTONES, streaks, today, uid } from '../utils';

const CATS = ['Pessoal', 'Estudos', 'Saúde', 'Trabalho', 'Outro'];
type P = { habits: Habit[]; setHabits: Setter<Habit[]>; say: (m: string) => void };
const blank = (): Habit => ({ id: '', name: '', category: 'Pessoal', days: [0,1,2,3,4,5,6], time: '', done: [], created: today() });

export default function Habits({ habits, setHabits, say }: P) {
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState<Habit | null>(null);
  const t = new Date(), ts = today();

  const toggle = (id: string) => {
    const h = habits.find((x) => x.id === id); if (!h) return;
    const on = h.done.includes(ts);
    const nh = { ...h, done: on ? h.done.filter((x) => x !== ts) : [...h.done, ts] };
    setHabits((l) => l.map((x) => x.id === id ? nh : x));
    if (on) say('Hábito desmarcado');
    else {
      const c = streaks(nh).cur;
      say(MILESTONES.includes(c) ? `Marco de ${c} dias atingido` : 'Hábito concluído');
    }
  };

  const save = () => {
    if (!form || !form.name.trim() || form.days.length === 0) return;
    const h = { ...form, name: form.name.trim(), id: form.id || uid() };
    setHabits((l) => form.id ? l.map((x) => x.id === form.id ? h : x) : [...l, h]);
    setForm(null);
  };

  const remove = (h: Habit) => {
    if (!confirm(`Excluir "${h.name}" e todo o histórico?`)) return;
    setHabits((l) => l.filter((x) => x.id !== h.id)); setSel(null);
  };

  const cur = habits.find((h) => h.id === sel);

  return <>
    <Head title="Hábitos" action={<Btn onClick={() => setForm(blank())} aria-label="Novo hábito" className="!px-0 w-12"><Plus size={22}/></Btn>} />
    {habits.length === 0 && <Empty text="Nenhum hábito ainda. Comece com um só." action={<Btn onClick={() => setForm(blank())}>Criar hábito</Btn>} />}
    <div className="space-y-3">
      {habits.map((h) => {
        const s = streaks(h), isDue = due(h, t);
        return <Card key={h.id} className={cx('flex items-center gap-1 !p-2', !isDue && 'opacity-60')}>
          <CheckBtn on={h.done.includes(ts)} onClick={() => toggle(h.id)} label={`Marcar ${h.name}`}/>
          <button onClick={() => setSel(h.id)} className="flex-1 text-left min-h-11 pl-1 pr-2">
            <p className="font-medium">{h.name}</p><p className="text-sm text-mu">{isDue ? freq(h) : 'Hoje não'}{h.time && ` · ${h.time}`}</p>
          </button>
          <span className="flex items-center gap-1 text-sm text-mu pr-2"><Flame size={16} className={s.cur ? 'text-ac' : ''}/>{s.cur}</span>
        </Card>;
      })}
    </div>

    {cur && (() => {
      const s = streaks(cur), next = MILESTONES.find((m) => m > s.cur);
      const days = Array.from({length:14},(_,i)=>addDays(t,i-13));
      return <Sheet title={cur.name} onClose={() => setSel(null)}>
        <div className="grid grid-cols-3 gap-2 text-center mb-4">{[['Sequência',s.cur],['Melhor',s.best],['Cumpridos',s.total]].map(([l,v])=><div key={String(l)} className="rounded-xl bg-bg p-3"><p className="text-2xl font-light">{v}</p><p className="text-xs text-mu">{l}</p></div>)}</div>
        <p className="text-mu mb-4">{next ? `Próximo marco: ${next} dias (faltam ${next-s.cur})` : 'Todos os marcos atingidos.'}</p>
        <p className="text-sm text-mu mb-2">Últimos 14 dias</p>
        <div className="grid grid-cols-7 gap-1.5 mb-5">{days.map(d=>{const k=iso(d),done=cur.done.includes(k),miss=!done&&due(cur,d)&&k<ts&&k>=cur.created;return <div key={k} className={cx('h-11 rounded-lg grid place-items-center text-sm',done?'bg-ac text-on font-bold':'border border-ln text-mu')}>{done?'✓':miss?'×':'·'}</div>})}</div>
        <div className="grid grid-cols-2 gap-3"><Btn variant="ghost" onClick={()=>{setForm(cur);setSel(null)}}>Editar</Btn><Btn variant="danger" onClick={()=>remove(cur)}><Trash2 size={18}/>Excluir</Btn></div>
      </Sheet>;
    })()}

    {form && <Sheet title={form.id ? 'Editar hábito' : 'Novo hábito'} onClose={()=>setForm(null)}>
      <Field label="Nome" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex.: Ler 20 minutos" autoFocus/>
      <Sel label="Categoria" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATS.map(c=><option key={c}>{c}</option>)}</Sel>
      <p className="text-sm text-mu">Dias</p>
      <div className="grid grid-cols-7 gap-1.5 mt-1 mb-3">{DOW.map((d,i)=>{const on=form.days.includes(i);return <button key={d} aria-pressed={on} onClick={()=>setForm({...form,days:on?form.days.filter(x=>x!==i):[...form.days,i].sort()})} className={cx('h-11 rounded-lg text-xs',on?'bg-ac text-on font-semibold':'border border-ln text-mu')}>{d}</button>})}</div>
      <Field label="Horário (opcional)" type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/>
      <Btn className="w-full mt-2" onClick={save} disabled={!form.name.trim()||form.days.length===0}>Salvar hábito</Btn>
    </Sheet>}
  </>;
}