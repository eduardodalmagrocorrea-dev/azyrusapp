import { useMemo } from 'react';
import { Card, Head } from '../ui';
import type { FinanceTransaction, Goal, Habit, MealEntry, Task, Workout } from '../types';
import { fmtDate, money, streaks } from '../utils';

type P={habits:Habit[];tasks:Task[];goals:Goal[];workouts:Workout[];meals:MealEntry[];finance:FinanceTransaction[]};

export default function History({habits,tasks,goals,workouts,meals,finance}:P){
  const completedHabits=habits.reduce((a,h)=>a+h.done.length,0);
  const completedTasks=tasks.filter(x=>x.done).length;
  const completedWorkouts=workouts.filter(x=>x.completed).length;
  const mealDays=new Set(meals.map(x=>x.date)).size;
  const income=finance.filter(x=>x.type==='receita').reduce((a,x)=>a+x.amount,0);
  const expense=finance.filter(x=>x.type==='despesa').reduce((a,x)=>a+x.amount,0);
  const recent=[...workouts.map(x=>({date:x.date,text:`Treino: ${x.name}`,detail:x.completed?'Concluído':'Planejado'})),...tasks.filter(x=>x.done).map(x=>({date:x.date,text:`Tarefa: ${x.title}`,detail:'Concluída'})),...meals.map(x=>({date:x.date,text:`Refeição: ${x.food}`,detail:x.meal}))].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12);

  return <>
    <Head title="Histórico"/>
    <div className="grid grid-cols-2 gap-3">
      <Card><p className="text-sm text-mu">Hábitos cumpridos</p><p className="text-2xl font-semibold mt-1 tabular-nums">{completedHabits}</p></Card>
      <Card><p className="text-sm text-mu">Tarefas concluídas</p><p className="text-2xl font-semibold mt-1 tabular-nums">{completedTasks}</p></Card>
      <Card><p className="text-sm text-mu">Treinos concluídos</p><p className="text-2xl font-semibold mt-1 tabular-nums">{completedWorkouts}</p></Card>
      <Card><p className="text-sm text-mu">Dias com dieta</p><p className="text-2xl font-semibold mt-1 tabular-nums">{mealDays}</p></Card>
    </div>
    <Card className="mt-3">
      <p className="font-medium mb-3">Finanças acumuladas</p>
      <div className="flex justify-between text-sm"><span>Receitas</span><span>{money(income)}</span></div>
      <div className="flex justify-between text-sm mt-2"><span>Despesas</span><span>{money(expense)}</span></div>
      <div className="flex justify-between font-medium mt-3 pt-3 border-t border-ln"><span>Saldo</span><span>{money(income-expense)}</span></div>
    </Card>
    <Card className="mt-3">
      <p className="font-medium mb-3">Atividade recente</p>
      {recent.length===0?<p className="text-sm text-mu">Ainda não há atividade registrada.</p>:<div className="data-list">{recent.map((x,i)=><div key={i} className="data-row justify-between"><div className="min-w-0 break-words"><p className="text-sm">{x.text}</p><p className="text-xs text-mu">{x.detail}</p></div><span className="text-xs text-mu">{fmtDate(x.date)}</span></div>)}</div>}
    </Card>
    <Card className="mt-3">
      <p className="font-medium mb-2">Sequências</p>
      <div className="data-list">{habits.map(h=><div key={h.id} className="data-row justify-between text-sm"><span className="row-name">{h.name}</span><span className="row-detail">{streaks(h).cur} dias</span></div>)}</div>
    </Card>
  </>;
}