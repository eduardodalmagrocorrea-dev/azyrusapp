import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { FinanceTransaction, Setter } from '../types';
import { Btn, Card, Empty, Field, Head, Sel, Sheet, cx } from '../ui';
import { fmtDate, money, today, uid } from '../utils';

const CATS=['Alimentação','Transporte','Casa','Estudos','Lazer','Saúde','Trabalho','Investimentos','Outro'];
const blank=():FinanceTransaction=>({id:'',date:today(),type:'despesa',description:'',category:'Alimentação',amount:0});
type P={items:FinanceTransaction[];setItems:Setter<FinanceTransaction[]>;say:(m:string)=>void};

export default function Finance({items,setItems,say}:P){
  const [form,setForm]=useState<FinanceTransaction|null>(null);
  const ts=today();
  const month=ts.slice(0,7);
  const current=items.filter(x=>x.date.startsWith(month));
  const income=current.filter(x=>x.type==='receita').reduce((a,x)=>a+x.amount,0);
  const expense=current.filter(x=>x.type==='despesa').reduce((a,x)=>a+x.amount,0);
  const balance=income-expense;
  const byCat=useMemo(()=>{const m=new Map<string,number>();current.filter(x=>x.type==='despesa').forEach(x=>m.set(x.category,(m.get(x.category)||0)+x.amount));return [...m].sort((a,b)=>b[1]-a[1]).slice(0,5)},[current]);

  const save=()=>{if(!form||!form.description.trim()||form.amount<=0)return;const x={...form,description:form.description.trim(),id:form.id||uid()};setItems(l=>form.id?l.map(i=>i.id===form.id?x:i):[...l,x]);setForm(null);say('Lançamento salvo')};
  const remove=(x:FinanceTransaction)=>{if(confirm(`Excluir "${x.description}"?`)){setItems(l=>l.filter(i=>i.id!==x.id));setForm(null)}};

  return <>
    <Head title="Finanças" action={<Btn onClick={()=>setForm(blank())} aria-label="Novo lançamento" className="!px-0 w-12"><Plus size={22}/></Btn>}/>
    <Card className="mb-5">
      <p className="text-sm text-mu">Saldo do mês</p>
      <p className={cx('mt-1 break-words text-3xl font-semibold tracking-tight tabular-nums', balance < 0 && 'text-danger')}>{money(balance)}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-ln pt-3">
        <div><dt className="text-xs text-mu">Receitas</dt><dd className="mt-1 break-words font-semibold tabular-nums text-success">{money(income)}</dd></div>
        <div><dt className="text-xs text-mu">Despesas</dt><dd className="mt-1 break-words font-semibold tabular-nums">{money(expense)}</dd></div>
      </dl>
    </Card>
    <h2 className="mb-2 font-semibold">Movimentações do mês</h2>
    {current.length===0?<Empty text="Nenhum lançamento neste mês." action={<Btn onClick={()=>setForm(blank())}>Adicionar lançamento</Btn>}/>:<div className="data-list mb-5">{current.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(x=><Card key={x.id} className="flat-group data-row gap-2"><span className={cx('size-8 shrink-0 rounded-full grid place-items-center',x.type==='receita'?'bg-success/10 text-success':'bg-sf text-mu')} >{x.type==='receita'?<ArrowUp size={17}/>:<ArrowDown size={17}/>}</span><button onClick={()=>setForm(x)} className="min-h-11 min-w-0 flex-1 text-left"><p className="row-name">{x.description}</p><p className="text-sm text-mu">{fmtDate(x.date)} · {x.category}</p></button><span className={cx('min-w-0 break-words text-sm tabular-nums text-right', x.type === 'receita' && 'text-success')}>{x.type==='receita'?'+':'-'} {money(x.amount)}</span><button className="size-11 shrink-0 grid place-items-center text-mu" onClick={()=>remove(x)} aria-label="Excluir"><Trash2 size={18}/></button></Card>)}</div>}
    <Card className="mb-3">
      <p className="font-medium mb-3">Despesas por categoria</p>
      {byCat.length===0?<p className="text-sm text-mu">Nenhuma despesa neste mês.</p>:<div className="space-y-3">{byCat.map(([c,v])=><div key={c}><div className="flex justify-between text-sm mb-1"><span>{c}</span><span>{money(v)}</span></div><div className="h-1.5 bg-ln rounded-full overflow-hidden"><div className="h-full bg-ac" style={{width:`${expense?Math.min(100,v/expense*100):0}%`}}/></div></div>)}</div>}
    </Card>
    {form&&<Sheet title={form.id?'Editar lançamento':'Novo lançamento'} onClose={()=>setForm(null)}>
      <div className="grid grid-cols-2 gap-2 mb-3"><button onClick={()=>setForm({...form,type:'despesa'})} className={cx('h-11 rounded-xl',form.type==='despesa'?'bg-ac text-on':'border border-ln')}>Despesa</button><button onClick={()=>setForm({...form,type:'receita'})} className={cx('h-11 rounded-xl',form.type==='receita'?'bg-ac text-on':'border border-ln')}>Receita</button></div>
      <Field label="Descrição" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} autoFocus/>
      <div className="grid grid-cols-2 gap-3"><Field label="Valor (R$)" type="number" min="0" step="0.01" value={form.amount||''} onChange={e=>setForm({...form,amount:Number(e.target.value)||0})}/><Field label="Data" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
      <Sel label="Categoria" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATS.map(c=><option key={c}>{c}</option>)}</Sel>
      <Btn className="w-full mt-2" onClick={save} disabled={!form.description.trim()||form.amount<=0}>Salvar lançamento</Btn>
      {form.id&&<Btn variant="danger" className="w-full mt-3" onClick={()=>remove(form)}><Trash2 size={18}/>Excluir</Btn>}
    </Sheet>}
  </>;
}