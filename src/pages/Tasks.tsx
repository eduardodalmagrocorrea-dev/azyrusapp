
import { useState } from 'react';
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  CalendarPlus,
  Flag
} from 'lucide-react';
import type { Setter, Task } from '../types';
import { Btn, Card, Empty, Field, Head, Sel, Sheet, cx } from '../ui';
import { today, uid } from '../utils';

const CATS = ['Pessoal', 'Estudos', 'Trabalho', 'Casa', 'Outro'];
const PRI = ['Baixa', 'Média', 'Alta'];

type P = {
  tasks: Task[];
  setTasks: Setter<Task[]>;
  say: (m: string) => void;
};

const blank = (date = today()): Task => ({
  id: '',
  title: '',
  date,
  time: '',
  priority: 1,
  category: 'Pessoal',
  done: false
});

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril',
  'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const dateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const formatDate = (date: string) => {
  if (!date) return '';
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
};

const priorityStyle = (priority: number) => {
  if (priority === 2) {
    return {
      label: 'ALTA',
      color: '#C5221F',
      background: '#FCE8E6'
    };
  }

  if (priority === 1) {
    return {
      label: 'MÉDIA',
      color: '#946200',
      background: '#FFF2CC'
    };
  }

  return {
    label: 'BAIXA',
    color: '#188038',
    background: '#E2F3E8'
  };
};

export default function Tasks({ tasks, setTasks, say }: P) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(today());
  const [form, setForm] = useState<Task | null>(null);

  const moveMonth = (amount: number) => {
    const date = new Date(viewYear, viewMonth + amount, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
  };

  const firstDay = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const calendarDays: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];

  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  const selectedTasks = tasks
    .filter(task => task.date === selectedDate)
    .sort((a, b) =>
      b.priority - a.priority ||
      Number(a.done) - Number(b.done) ||
      (a.time || '23:59').localeCompare(b.time || '23:59')
    );

  const save = () => {
    if (!form || !form.title.trim() || !form.date) return;

    const task: Task = {
      ...form,
      title: form.title.trim(),
      id: form.id || uid()
    };

    setTasks(list =>
      form.id
        ? list.map(item => item.id === form.id ? task : item)
        : [...list, task]
    );

    setSelectedDate(task.date);

    const [year, month] = task.date.split('-').map(Number);
    setViewYear(year);
    setViewMonth(month - 1);

    say(form.id ? 'Evento atualizado' : 'Data importante adicionada');
    setForm(null);
  };

  const remove = (task: Task) => {
    if (confirm(`Excluir "${task.title}"?`)) {
      setTasks(list => list.filter(item => item.id !== task.id));
      say('Evento excluído');
      setForm(null);
    }
  };

  const openNew = (date = selectedDate) => {
    setForm(blank(date));
  };

  const isToday = (date: string) => date === today();

  return (
    <>
      <Head
        title="Calendário"
        action={
          <Btn
            onClick={() => openNew()}
            aria-label="Adicionar data importante"
            className="!px-0 w-12"
          >
            <Plus size={22} />
          </Btn>
        }
      />

      <Card className="!p-4 mb-4">
        <div className="flex items-center justify-between gap-2 mb-5">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="flex items-center justify-center size-10 rounded-xl border border-ln"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="text-center">
            <h2 className="text-lg font-semibold">
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            <button
              type="button"
              onClick={() => {
                const date = new Date();
                setViewYear(date.getFullYear());
                setViewMonth(date.getMonth());
                setSelectedDate(today());
              }}
              className="text-xs text-mu underline mt-1"
            >
              Ir para hoje
            </button>
          </div>

          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="flex items-center justify-center size-10 rounded-xl border border-ln"
            aria-label="Próximo mês"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map(day => (
            <div
              key={day}
              className="text-center text-xs text-mu py-2 font-medium"
            >
              {day}
            </div>
          ))}

          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="min-h-12" />;
            }

            const date = dateKey(viewYear, viewMonth, day);
            const dayTasks = tasks.filter(task => task.date === date);
            const selected = date === selectedDate;

            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={cx(
                  'relative flex flex-col items-center justify-center rounded-xl min-h-12 gap-1 transition-colors',
                  selected
                    ? 'bg-ac text-on font-semibold'
                    : isToday(date)
                      ? 'border border-ac'
                      : 'hover:bg-sf'
                )}
                aria-label={`${day} de ${MONTHS[viewMonth]}, ${dayTasks.length} eventos`}
                aria-pressed={selected}
              >
                <span className="text-sm">{day}</span>

                {dayTasks.length > 0 && (
                  <span className="flex gap-0.5 items-center justify-center">
                    {dayTasks.slice(0, 3).map((task, i) => (
                      <span
                        key={task.id || i}
                        className="size-1 rounded-full"
                        style={{
                          background: selected ? 'currentColor' : priorityStyle(task.priority).color
                        }}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-xs text-mu">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: '#C5221F' }} />
            Alta
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: '#B77900' }} />
            Média
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: '#188038' }} />
            Baixa
          </span>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold">Datas importantes</h3>
          <p className="text-sm text-mu">{formatDate(selectedDate)}</p>
        </div>

        <Btn onClick={() => openNew(selectedDate)}>
          <Plus size={18} />
          Adicionar
        </Btn>
      </div>

      {selectedTasks.length === 0 ? (
        <Empty
          text="Nenhuma data importante neste dia."
          action={
            <Btn onClick={() => openNew(selectedDate)}>
              <CalendarPlus size={18} />
              Adicionar evento
            </Btn>
          }
        />
      ) : (
        <div className="space-y-2">
          {selectedTasks.map(task => {
            const priority = priorityStyle(task.priority);

            return (
              <Card key={task.id} className="!p-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...task })}
                  className="w-full text-left"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex items-center justify-center rounded-xl shrink-0"
                      style={{
                        width: 42,
                        height: 42,
                        background: priority.background,
                        color: priority.color
                      }}
                    >
                      <Flag size={21} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={cx(
                        'font-medium break-words',
                        task.done && 'line-through text-mu'
                      )}>
                        {task.title}
                      </p>

                      <p className="text-sm text-mu mt-1">
                        {task.category}
                      </p>

                      {task.time && (
                        <p className="flex items-center gap-1 text-sm text-mu mt-1">
                          <Clock size={14} />
                          {task.time}
                        </p>
                      )}

                      {task.done && (
                        <p className="text-xs text-mu mt-1">Concluído</p>
                      )}
                    </div>

                    <span
                      className="text-xs font-bold rounded-full px-2.5 py-1 shrink-0"
                      style={{
                        background: priority.background,
                        color: priority.color
                      }}
                    >
                      {priority.label}
                    </span>
                  </div>
                </button>

                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTasks(list =>
                        list.map(item =>
                          item.id === task.id
                            ? { ...item, done: !item.done }
                            : item
                        )
                      );
                      say(task.done ? 'Evento reaberto' : 'Evento concluído');
                    }}
                    className="text-xs text-mu underline px-2 py-1"
                  >
                    {task.done ? 'Marcar pendente' : 'Marcar concluído'}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {form && (
        <Sheet
          title={form.id ? 'Editar data importante' : 'Nova data importante'}
          onClose={() => setForm(null)}
        >
          <Field
            label="Título"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Ex.: Aniversário, prova, viagem..."
            autoFocus
          />

          <Field
            label="Data"
            type="date"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
          />

          <Field
            label="Horário (opcional)"
            type="time"
            value={form.time}
            onChange={e => setForm({ ...form, time: e.target.value })}
          />

          <Sel
            label="Categoria"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
          >
            {CATS.map(category => (
              <option key={category}>{category}</option>
            ))}
          </Sel>

          <Sel
            label="Prioridade"
            value={form.priority}
            onChange={e =>
              setForm({
                ...form,
                priority: Number(e.target.value) as 0 | 1 | 2
              })
            }
          >
            {PRI.map((priority, index) => (
              <option key={priority} value={index}>
                {priority}
              </option>
            ))}
          </Sel>

          <Btn
            className="w-full mt-3"
            onClick={save}
            disabled={!form.title.trim() || !form.date}
          >
            Salvar data
          </Btn>

          {form.id && (
            <Btn
              variant="danger"
              className="w-full mt-3"
              onClick={() => remove(form)}
            >
              <Trash2 size={18} />
              Excluir data
            </Btn>
          )}
        </Sheet>
      )}
    </>
  );
}
