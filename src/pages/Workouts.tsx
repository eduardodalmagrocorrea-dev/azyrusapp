import { useState } from 'react';
import { Dumbbell, Plus, Trash2 } from 'lucide-react';
import type { Exercise, ExerciseSet, Setter, Workout } from '../types';
import { Btn, Card, Empty, Field, Head, Sel, Sheet, cx } from '../ui';
import { fmtDate, fmtNum, today, uid } from '../utils';

type P={workouts:Workout[];setWorkouts:Setter<Workout[]>;say:(m:string)=>void};
const blank=():Workout=>({id:'',name:'Treino',date:today(),duration:0,notes:'',exercises:[],completed:false});
const blankExercise=():Exercise=>({id:'',name:'',sets:[{id:uid(),reps:10,weight:0}],rest:60,notes:''});

export default function Workouts({workouts,setWorkouts,say}:P){
  const [form,setForm]=useState<Workout|null>(null);
  const [selected,setSelected]=useState<Workout|null>(null);

  const save=()=>{
    if(!form||!form.name.trim())return;
    const w={...form,name:form.name.trim(),id:form.id||uid(),exercises:form.exercises.filter(e=>e.name.trim())};
    setWorkouts(l=>form.id?l.map(x=>x.id===form.id?w:x):[...l,w]);
    say('Treino salvo'); setForm(null);
  };
  const remove=(w:Workout)=>{
    if(confirm(`Excluir "${w.name}"?`)){setWorkouts(l=>l.filter(x=>x.id!==w.id));setSelected(null);setForm(null)}
  };
  const toggle=(w:Workout)=>{
    const nw={...w,completed:!w.completed};
    setWorkouts(l=>l.map(x=>x.id===w.id?nw:x));
    setSelected(nw);
    say(nw.completed?'Treino concluído':'Treino reaberto');
  };

  const addExercise=()=>form&&setForm({...form,exercises:[...form.exercises,blankExercise()]});
  const updateExercise=(id:string,p:Partial<Exercise>)=>form&&setForm({...form,exercises:form.exercises.map(e=>e.id===id?{...e,...p}:e)});
  const removeExercise=(id:string)=>form&&setForm({...form,exercises:form.exercises.filter(e=>e.id!==id)});
  const addSet=(e:Exercise)=>updateExercise(e.id,{sets:[...e.sets,{id:uid(),reps:10,weight:0}]});
  const updateSet=(e:Exercise,sid:string,p:Partial<ExerciseSet>)=>updateExercise(e.id,{sets:e.sets.map(s=>s.id===sid?{...s,...p}:s)});
  const removeSet=(e:Exercise,sid:string)=>updateExercise(e.id,{sets:e.sets.filter(s=>s.id!==sid)});

  return <>
    <Head title="Treinos" action={<Btn onClick={()=>setForm(blank())} aria-label="Novo treino" className="!px-0 w-12"><Plus size={22}/></Btn>}/>
    {workouts.length===0&&<Empty text="Registre seu primeiro treino." action={<Btn onClick={()=>setForm(blank())}>Novo treino</Btn>}/>}
    <div className="space-y-3">
      {workouts.slice().sort((a,b)=>(b.date).localeCompare(a.date)).map(w=><Card key={w.id}>
        <button onClick={()=>setSelected(w)} className="w-full text-left">
          <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{w.name}</p><p className="text-sm text-mu">{fmtDate(w.date)} · {w.exercises.length} exercício(s){w.duration?` · ${w.duration} min`:''}</p></div><span className={cx('text-xs px-2 py-1 rounded-full',w.completed?'bg-ac text-on':'border border-ln text-mu')}>{w.completed?'Concluído':'Planejado'}</span></div>
        </button>
        <div className="flex gap-2 mt-3"><Btn variant="ghost" className="flex-1" onClick={()=>setForm(w)}>Editar</Btn><Btn className="flex-1" onClick={()=>toggle(w)}>{w.completed?'Reabrir':'Concluir'}</Btn></div>
      </Card>)}
    </div>

    {selected&&<Sheet title={selected.name} onClose={()=>setSelected(null)}>
      <div className="space-y-3">{selected.exercises.map(e=><Card key={e.id} className="!bg-bg"><p className="font-medium">{e.name}</p><p className="text-sm text-mu mb-2">{e.sets.length} série(s) · descanso {e.rest}s</p>{e.sets.map((s,i)=><p key={s.id} className="text-sm">{i+1}. {s.reps} reps · {fmtNum(s.weight)} kg</p>)}</Card>)}</div>
      {selected.notes&&<p className="text-sm text-mu mt-3">{selected.notes}</p>}
      <div className="grid grid-cols-2 gap-3 mt-5"><Btn variant="ghost" onClick={()=>{setForm(selected);setSelected(null)}}>Editar</Btn><Btn variant="danger" onClick={()=>remove(selected)}><Trash2 size={18}/>Excluir</Btn></div>
    </Sheet>}

    {form&&<Sheet title={form.id?'Editar treino':'Novo treino'} onClose={()=>setForm(null)}>
      <Field label="Nome do treino" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} autoFocus/>
      <div className="grid grid-cols-2 gap-3"><Field label="Data" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/><Field label="Duração (min)" type="number" min="0" value={form.duration||''} onChange={e=>setForm({...form,duration:Number(e.target.value)||0})}/></div>
      <Field label="Observações" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
      <div className="flex items-center justify-between mt-4 mb-2"><p className="font-medium">Exercícios</p><Btn variant="ghost" onClick={addExercise}><Plus size={18}/>Adicionar</Btn></div>
      <div className="space-y-4">
        {form.exercises.map((e,idx)=><Card key={e.id} className="!bg-bg">
          <div className="flex gap-2"><Field label={`Exercício ${idx+1}`} value={e.name} onChange={x=>updateExercise(e.id,{name:x.target.value})}/><button aria-label="Excluir exercício" className="mt-6 size-11 grid place-items-center text-mu" onClick={()=>removeExercise(e.id)}><Trash2 size={18}/></button></div>
          <Sel label="Descanso" value={e.rest} onChange={x=>updateExercise(e.id,{rest:Number(x.target.value)})}><option value="30">30s</option><option value="60">60s</option><option value="90">90s</option><option value="120">120s</option><option value="180">180s</option></Sel>
          <p className="text-sm text-mu mb-2">Séries</p>
          <div className="space-y-2">{e.sets.map((s,i)=><div key={s.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end"><Field label={`S${i+1} reps`} type="number" min="0" value={s.reps} onChange={x=>updateSet(e.id,s.id,{reps:Number(x.target.value)||0})}/><Field label="Peso kg" type="number" min="0" step="0.5" value={s.weight} onChange={x=>updateSet(e.id,s.id,{weight:Number(x.target.value)||0})}/><button aria-label="Excluir série" className="size-11 grid place-items-center text-mu mb-3" onClick={()=>removeSet(e,s.id)}><Trash2 size={16}/></button></div>)}</div>
          <Btn variant="ghost" className="w-full mt-1" onClick={()=>addSet(e)}>Adicionar série</Btn>
        </Card>)}
      </div>
      <Btn className="w-full mt-4" onClick={save} disabled={!form.name.trim()}>Salvar treino</Btn>
    </Sheet>}
  </>;
}