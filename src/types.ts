import type { Dispatch, SetStateAction } from 'react';

export type Setter<T> = Dispatch<SetStateAction<T>>;
export type Tab = 'home' | 'habits' | 'tasks' | 'goals' | 'more';
export type MorePage = 'more' | 'workouts' | 'diet' | 'finance' | 'history';

export type Habit = {
  id: string;
  name: string;
  category: string;
  days: number[];
  time: string;
  done: string[];
  created: string;
};

export type Task = {
  id: string;
  title: string;
  date: string;
  time: string;
  priority: 0 | 1 | 2;
  category: string;
  done: boolean;
};

export type Goal = {
  id: string;
  title: string;
  desc: string;
  due: string;
  category: string;
  status: 'ativa' | 'concluída';
  tracked: boolean;
  unit: string;
  start: number;
  current: number;
  target: number;
  pct: number;
};

export type ExerciseSet = {
  id: string;
  reps: number;
  weight: number;
};

export type Exercise = {
  id: string;
  name: string;
  sets: ExerciseSet[];
  rest: number;
  notes: string;
};

export type Workout = {
  id: string;
  name: string;
  date: string;
  duration: number;
  notes: string;
  exercises: Exercise[];
  completed: boolean;
};

export type MealEntry = {
  id: string;
  date: string;
  meal: string;
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type WaterEntry = {
  id: string;
  date: string;
  amount: number;
};

export type FinanceTransaction = {
  id: string;
  date: string;
  type: 'receita' | 'despesa';
  description: string;
  category: string;
  amount: number;
};

export type Settings = {
  name: string;
  theme: 'dark' | 'light';
  onboarded: boolean;
};