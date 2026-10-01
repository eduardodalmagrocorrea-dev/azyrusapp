import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Setter, Task } from '../types';
import { Btn, Card, CheckBtn, Empty, Field, Head, Sel, Sheet, cx } from '../ui';
import { fmtDate, today, uid } from '../utils';

const CATS = ['Pessoal','Estudos','Trabalho','Casa','Outro'];
const PRI = ['Baixa','Média','Alta'];
const FILTERS = ['Todas','Hoje','Pendentes','Concluídas'] as const;
type P = { tasks: Task[]; setTasks: Setter<Task[]>; say: (m:string)=>void };
const blank=():Task=>({id:'',title:'',date:today(),time:'',priority:1,category:'Pessoal',done:false});

export default function Tasks({tasks,setTasks,say}:P){
  const [f,setF]=useState<(typeof FILTERS)[number]>('Pendentes');
  const [form,setForm]=useState<Task|null>(null);
  const ts=today();
  const list=tasks.filter(x=>f==='Hoje'?x.date===ts:f==='Pendentes'?!x.done:f==='Concluídas'?x.done:true)
    .sort((a,b)=>Number(a.done)-Number(b.done)||(a.date+a.time).localeCompare(b.date+b.time));
  const toggle=(x:Task)=>{setTasks(l=>l.map(y=>y.id===x.id?{...y,done:!y.done}:y));say(x.done?'Tarefa reaberta':'Tarefa concluída')};
  const save=()=>{if(!form||!form.title.trim())return;const t={...form,title:form.title.trim(),id:form.id||uid()};setTasks(l=>form.id?l.map(x=>x.id===form.id?t:x):[...l,t]);setForm(null);};
  const remove=(t:Task)=>{if(confirm(`Excluir "${t.title}"?`)){setTasks(l=>l.filter(x=>x.id!==t.id));setForm(null)}};
  return <>
    <Head title="Tarefas" action={<Btn onClick={()=>setForm(blank())} aria-label="Nova tarefa" className="!px-0 w-12"><Plus size={22}/></Btn>}/>
    <div className="flex gap-2 overflow-x-auto -mx-5 px-5 mb-4">{FILTERS.map(k=><button key={k} onClick={()=>setF(k)} aria-pressed={f===k} className={cx('h-10 px-4 rounded-full text-sm shrink-0',f===k?'bg-ac text-on font-medium':'border border-ln text-mu')}>{k}</button>)}</div>
    {list.length===0&&<Empty text={f==='Concluídas'?'Nada concluído ainda.':'Nenhuma tarefa aqui.'} action={<Btn onClick={()=>setForm(blank())}>Nova tarefa</Btn>}/>}
    <div className="space-y-2">{list.map(x=><Card key={x.id} className="flex items-center gap-1 !p-2"><CheckBtn on={x.done} onClick={()=>toggle(x)} label={`${x.done?'Reabrir':'Concluir'} ${x.title}`}/><button onClick={()=>setForm(x)} className="flex-1 text-left min-h-11 pl-1"><p className={cx('font-medium',x.done&&'line-through text-mu')}>{x.title}</p><p className="text-sm text-mu">{fmtDate(x.date)}{x.time&&` ${x.time}`} · {x.category}{x.priority>0&&` · ${PRI[x.priority]}`}</p></button></Card>)}</div>
    {form&&<Sheet title={form.id?'Editar tarefa':'Nova tarefa'} onClose={()=>setForm(null)}>
      <Field label="Título" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} autoFocus/>
      <div className="grid grid-cols-2 gap-3"><Field label="Data" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/><Field label="Horário" type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/><Sel label="Prioridade" value={form.priority} onChange={e=>setForm({...form,priority:Number(e.target.value) as 0|1|2})}>{PRI.map((p,i)=><option key={p} value={i}>{p}</option>)}</Sel><Sel label="Categoria" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATS.map(c=><option key={c}>{c}</option>)}</Sel></div>
      <Btn className="w-full mt-2" onClick={save} disabled={!form.title.trim()}>Salvar tarefa</Btn>
      {form.id&&<Btn variant="danger" className="w-full mt-3" onClick={()=>remove(form)}><Trash2 size={18}/>Excluir</Btn>}
    </Sheet>}
  </>;
}