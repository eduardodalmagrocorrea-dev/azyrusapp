import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Goal, Setter } from '../types';
import { Bar, Btn, Card, Empty, Field, Head, Sel, Sheet } from '../ui';
import { fmtDate, fmtNum, goalPct, num, uid } from '../utils';

const CATS=['Pessoal','Finanças','Estudos','Saúde','Trabalho','Outro'];
type P={goals:Goal[];setGoals:Setter<Goal[]>;say:(m:string)=>void};
type Draft={g:Goal;start:string;current:string;target:string};
const blank=():Goal=>({id:'',title:'',desc:'',due:'',category:'Pessoal',status:'ativa',tracked:false,unit:'',start:0,current:0,target:100,pct:0});
const draft=(g:Goal):Draft=>({g,start:String(g.start),current:String(g.current),target:String(g.target)});

export default function Goals({goals,setGoals,say}:P){
  const [d,setD]=useState<Draft|null>(null);
  const save=()=>{
    if(!d||!d.g.title.trim())return;
    const g:Goal={...d.g,title:d.g.title.trim(),start:num(d.start),current:num(d.current),target:num(d.target)};
    setGoals(l=>g.id?l.map(x=>x.id===g.id?g:x):[...l,{...g,id:uid()}]);
    say(g.status==='concluída'?'Meta concluída':'Meta salva');
    setD(null);
  };
  const remove=(g:Goal)=>{if(confirm(`Excluir "${g.title}"?`)){setGoals(l=>l.filter(x=>x.id!==g.id));setD(null)}};
  const set=(p:Partial<Goal>)=>d&&setD({...d,g:{...d.g,...p}});
  return <>
    <Head title="Metas" action={<Btn onClick={()=>setD(draft(blank()))} aria-label="Nova meta" className="!px-0 w-12"><Plus size={22}/></Btn>}/>
    {goals.length===0&&<Empty text="Defina o que você quer alcançar." action={<Btn onClick={()=>setD(draft(blank()))}>Criar meta</Btn>}/>}
    <div className="space-y-3">{goals.map(g=><Card key={g.id} onClick={()=>setD(draft(g))}><div className="flex justify-between gap-3"><p className="font-medium">{g.title}</p><span className="text-sm text-mu shrink-0">{Math.round(goalPct(g))}%</span></div><div className="my-3"><Bar pct={goalPct(g)}/></div><p className="text-sm text-mu">{g.tracked?`${g.unit} ${fmtNum(g.current)} / ${g.unit} ${fmtNum(g.target)}`.replaceAll('  ',' '):g.category}{g.due&&` · até ${fmtDate(g.due)}`}{g.status==='concluída'&&' · Concluída'}</p></Card>)}</div>
    {d&&<Sheet title={d.g.id?'Editar meta':'Nova meta'} onClose={()=>setD(null)}>
      <Field label="Nome" value={d.g.title} onChange={e=>set({title:e.target.value})} placeholder="Ex.: Economizar R$ 5.000" autoFocus/>
      <Field label="Descrição (opcional)" value={d.g.desc} onChange={e=>set({desc:e.target.value})}/>
      <div className="grid grid-cols-2 gap-3"><Field label="Prazo" type="date" value={d.g.due} onChange={e=>set({due:e.target.value})}/><Sel label="Categoria" value={d.g.category} onChange={e=>set({category:e.target.value})}>{CATS.map(c=><option key={c}>{c}</option>)}</Sel></div>
      <label className="flex items-center gap-3 min-h-11 mb-2"><input type="checkbox" className="size-5 accent-[var(--ac)]" checked={d.g.tracked} onChange={e=>set({tracked:e.target.checked})}/>Tem valores numéricos</label>
      {d.g.tracked?<><Field label="Unidade (ex.: R$, kg, livros)" value={d.g.unit} onChange={e=>set({unit:e.target.value})}/><div className="grid grid-cols-3 gap-2"><Field label="Inicial" inputMode="decimal" value={d.start} onChange={e=>setD({...d,start:e.target.value})}/><Field label="Atual" inputMode="decimal" value={d.current} onChange={e=>setD({...d,current:e.target.value})}/><Field label="Final" inputMode="decimal" value={d.target} onChange={e=>setD({...d,target:e.target.value})}/></div></>:<label className="block mb-3"><span className="text-sm text-mu">Progresso: {d.g.pct}%</span><input type="range" min="0" max="100" step="5" value={d.g.pct} onChange={e=>set({pct:Number(e.target.value)})} className="w-full h-11 accent-[var(--ac)]"/></label>}
      <Sel label="Status" value={d.g.status} onChange={e=>set({status:e.target.value as Goal['status']})}><option value="ativa">Ativa</option><option value="concluída">Concluída</option></Sel>
      <Btn className="w-full mt-2" onClick={save} disabled={!d.g.title.trim()}>Salvar meta</Btn>
      {d.g.id&&<Btn variant="danger" className="w-full mt-3" onClick={()=>remove(d.g)}><Trash2 size={18}/>Excluir</Btn>}
    </Sheet>}
  </>;
}