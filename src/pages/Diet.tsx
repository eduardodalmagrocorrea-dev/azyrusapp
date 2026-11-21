import { useState } from 'react';
import { Plus, Trash2, Droplets } from 'lucide-react';
import type { MealEntry, Setter, WaterEntry } from '../types';
import { Btn, Card, Empty, Field, Head, Sel, Sheet } from '../ui';
import { fmtNum, today, uid } from '../utils';

type P={meals:MealEntry[];setMeals:Setter<MealEntry[]>;water:WaterEntry[];setWater:Setter<WaterEntry[]>;say:(m:string)=>void};
const MEALS=['Café da manhã','Almoço','Lanche','Jantar','Outro'];
const blank=():MealEntry=>({id:'',date:today(),meal:'Café da manhã',food:'',calories:0,protein:0,carbs:0,fat:0});

export default function Diet({meals,setMeals,water,setWater,say}:P){
  const [form,setForm]=useState<MealEntry|null>(null);
  const [waterForm,setWaterForm]=useState(false);
  const [editingWater,setEditingWater]=useState<WaterEntry|null>(null);
  const ts=today();
  const day=meals.filter(x=>x.date===ts);
  const totals=day.reduce((a,x)=>({cal:a.cal+x.calories,p:a.p+x.protein,c:a.c+x.carbs,f:a.f+x.fat}),{cal:0,p:0,c:0,f:0});
  const waterTotal=water.filter(x=>x.date===ts).reduce((a,x)=>a+x.amount,0);

  const save=()=>{if(!form||!form.food.trim())return;const x={...form,food:form.food.trim(),id:form.id||uid()};setMeals(l=>form.id?l.map(m=>m.id===form.id?x:m):[...l,x]);setForm(null);say('Refeição salva')};
  const remove=(x:MealEntry)=>{if(confirm(`Excluir "${x.food}"?`)){setMeals(l=>l.filter(m=>m.id!==x.id));setForm(null)}};
  const addWater=(amount:number)=>{setWater(l=>[...l,{id:uid(),date:ts,amount}]);say(`${amount} ml adicionados`)};

  return <>
    <Head title="Dieta" action={<Btn onClick={()=>setForm(blank())} aria-label="Nova refeição" className="!px-0 w-12"><Plus size={22}/></Btn>}/>
    <Card className="grid grid-cols-2 gap-x-3 gap-y-2 mb-3">
      <div className="min-w-0"><p className="text-sm text-mu">Calorias</p><p className="break-words text-2xl font-semibold mt-1 tabular-nums">{fmtNum(totals.cal)} <span className="text-sm font-normal text-mu">kcal</span></p></div>
      <div className="min-w-0 border-l border-ln pl-3"><p className="text-sm text-mu">Proteína</p><p className="break-words text-2xl font-semibold mt-1 tabular-nums">{fmtNum(totals.p)} <span className="text-sm font-normal text-mu">g</span></p></div>
    </Card>
    <Card className="mb-3">
      <div className="flex items-center gap-2 mb-2"><Droplets size={18}/><p className="font-medium">Água</p><span className="ml-auto text-sm text-mu">{fmtNum(waterTotal)} ml</span></div>
      <div className="grid grid-cols-2 min-[400px]:grid-cols-4 gap-2">{[250,500,750,1000].map(n=><Btn key={n} variant="ghost" className="whitespace-nowrap !px-2" onClick={()=>addWater(n)}>+{n} ml</Btn>)}</div>
      <Btn variant="ghost" className="w-full mt-2" onClick={()=>setWaterForm(true)}>Adicionar outro volume</Btn>
      {water.filter(x=>x.date===ts).map(x=><div key={x.id} className="flex items-center justify-between mt-2 text-sm"><span>{fmtNum(x.amount)} ml</span><button type="button" className="text-ac underline px-2 min-h-11" onClick={()=>setEditingWater({...x})}>Editar</button></div>)}
    </Card>
    <h2 className="mt-5 mb-2 font-semibold">Refeições de hoje</h2>
    {day.length===0?<Empty text="Nenhuma refeição registrada hoje." action={<Btn onClick={()=>setForm(blank())}>Adicionar refeição</Btn>}/>:<div className="data-list">{day.map(x=><Card key={x.id} className="flat-group data-row"><button onClick={()=>setForm(x)} className="min-h-11 min-w-0 flex-1 text-left"><p className="row-name">{x.food}</p><p className="text-sm text-mu">{x.meal} · {fmtNum(x.calories)} kcal · P {fmtNum(x.protein)}g · C {fmtNum(x.carbs)}g · G {fmtNum(x.fat)}g</p></button><button className="size-11 shrink-0 grid place-items-center text-mu" onClick={()=>remove(x)} aria-label="Excluir"><Trash2 size={18}/></button></Card>)}</div>}
    {form&&<Sheet title={form.id?'Editar refeição':'Nova refeição'} onClose={()=>setForm(null)}>
      <Sel label="Refeição" value={form.meal} onChange={e=>setForm({...form,meal:e.target.value})}>{MEALS.map(x=><option key={x}>{x}</option>)}</Sel>
      <Field label="Alimento / descrição" value={form.food} onChange={e=>setForm({...form,food:e.target.value})} placeholder="Ex.: Arroz, frango e salada" autoFocus/>
      <div className="grid grid-cols-2 gap-3"><Field label="Data" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/><Field label="Calorias" type="number" min="0" value={form.calories||''} onChange={e=>setForm({...form,calories:Number(e.target.value)||0})}/><Field label="Proteína (g)" type="number" min="0" value={form.protein||''} onChange={e=>setForm({...form,protein:Number(e.target.value)||0})}/><Field label="Carboidratos (g)" type="number" min="0" value={form.carbs||''} onChange={e=>setForm({...form,carbs:Number(e.target.value)||0})}/><Field label="Gorduras (g)" type="number" min="0" value={form.fat||''} onChange={e=>setForm({...form,fat:Number(e.target.value)||0})}/></div>
      <Btn className="w-full mt-2" onClick={save} disabled={!form.food.trim()}>Salvar refeição</Btn>
      {form.id&&<Btn variant="danger" className="w-full mt-3" onClick={()=>remove(form)}><Trash2 size={18}/>Excluir</Btn>}
    </Sheet>}
    {waterForm&&<Sheet title="Adicionar água" onClose={()=>setWaterForm(false)}><div className="grid grid-cols-2 gap-2">{[1500,2000,2500,3000].map(n=><Btn key={n} variant="ghost" onClick={()=>{addWater(n-waterTotal>0?n-waterTotal:500);setWaterForm(false)}}>{n} ml no total</Btn>)}</div></Sheet>}
    {editingWater&&<Sheet title="Editar água" onClose={()=>setEditingWater(null)}><Field label="Data" type="date" value={editingWater.date} onChange={e=>setEditingWater({...editingWater,date:e.target.value})}/><Field label="Volume (ml)" type="number" min="1" value={editingWater.amount || ''} onChange={e=>setEditingWater({...editingWater,amount:Number(e.target.value)})}/><Btn className="w-full" disabled={!editingWater.date || !Number.isFinite(editingWater.amount) || editingWater.amount<=0} onClick={()=>{setWater(list=>list.map(x=>x.id===editingWater.id?editingWater:x));setEditingWater(null);say('Água atualizada')}}>Salvar</Btn><Btn variant="danger" className="w-full mt-3" onClick={()=>{if(confirm('Excluir este registro de água?')){setWater(list=>list.filter(x=>x.id!==editingWater.id));setEditingWater(null);say('Água excluída')}}}>Excluir</Btn></Sheet>}
  </>;
}
