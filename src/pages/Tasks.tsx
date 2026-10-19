
import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
  ArrowLeft,
  FileText,
  X,
} from 'lucide-react';
import type { Setter, Task } from '../types';
import { Btn, Card, Empty, Field, Head, Sel, Sheet, cx } from '../ui';
import { today, uid } from '../utils';

const CATS = ['Pessoal', 'Estudos', 'Trabalho', 'Casa', 'Outro'];
const PRI = ['Baixa', 'Média', 'Alta'];

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril',
  'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const NOTES_KEY = 'azyrus-notes-v1';

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type P = {
  tasks: Task[];
  setTasks: Setter<Task[]>;
  say: (message: string) => void;
};

const dateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const formatDate = (date: string) => {
  if (!date) return '';
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

const formatNoteDate = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).replace('.', '');
};

const blankTask = (date = today()): Task => ({
  id: '',
  title: '',
  date,
  time: '',
  priority: 1,
  category: 'Pessoal',
  done: false,
});

const blankNote = (): Note => {
  const now = new Date().toISOString();

  return {
    id: '',
    title: '',
    content: '',
    createdAt: now,
    updatedAt: now,
  };
};

function loadNotes(): Note[] {
  try {
    const stored = localStorage.getItem(NOTES_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is Note =>
        item !== null &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.content === 'string' &&
        typeof item.createdAt === 'string' &&
        typeof item.updatedAt === 'string'
    );
  } catch {
    return [];
  }
}

export default function Tasks({ tasks, setTasks, say }: P) {
  const [tab, setTab] = useState<'notes' | 'calendar'>('notes');
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [search, setSearch] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [taskForm, setTaskForm] = useState<Task | null>(null);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(today());

  useEffect(() => {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch {
      say('Não foi possível salvar as notas neste aparelho');
    }
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');

    return [...notes]
      .filter(note =>
        !term ||
        note.title.toLocaleLowerCase('pt-BR').includes(term) ||
        note.content.toLocaleLowerCase('pt-BR').includes(term)
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, search]);

  const noteGroups = useMemo(() => {
    const groups: { title: string; notes: Note[] }[] = [];

    for (const note of filteredNotes) {
      const date = new Date(note.updatedAt);
      const now = new Date();
      const days = Math.floor(
        (now.getTime() - date.getTime()) / 86400000
      );

      let title: string;

      if (days >= 0 && days < 30) {
        title = 'Últimos 30 Dias';
      } else {
        const sameYear = date.getFullYear() === now.getFullYear();
        title = sameYear
          ? MONTHS[date.getMonth()]
          : `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
      }

      let group = groups.find(item => item.title === title);

      if (!group) {
        group = { title, notes: [] };
        groups.push(group);
      }

      group.notes.push(note);
    }

    return groups;
  }, [filteredNotes]);

  const saveNote = () => {
    if (!editingNote) return;

    if (!editingNote.title.trim() && !editingNote.content.trim()) {
      setEditingNote(null);
      return;
    }

    const now = new Date().toISOString();
    const note: Note = {
      ...editingNote,
      title: editingNote.title.trim() || 'Nova Nota',
      id: editingNote.id || uid(),
      createdAt: editingNote.createdAt || now,
      updatedAt: now,
    };

    setNotes(list =>
      note.id && list.some(item => item.id === note.id)
        ? list.map(item => item.id === note.id ? note : item)
        : [note, ...list]
    );

    setEditingNote(null);
    setViewingNote(null);
    say('Nota salva');
  };

  const deleteNote = (note: Note) => {
    if (!confirm(`Excluir a nota "${note.title || 'Nova Nota'}"?`)) return;

    setNotes(list => list.filter(item => item.id !== note.id));
    setEditingNote(null);
    setViewingNote(null);
    say('Nota excluída');
  };

  const openNote = (note: Note) => {
    setViewingNote(note);
    setEditingNote({ ...note });
  };

  const moveMonth = (amount: number) => {
    const date = new Date(viewYear, viewMonth + amount, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
  };

  const firstDay = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const calendarDays: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  const selectedTasks = tasks
    .filter(task => task.date === selectedDate)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const saveTask = () => {
    if (!taskForm || !taskForm.title.trim() || !taskForm.date) return;

    const task: Task = {
      ...taskForm,
      title: taskForm.title.trim(),
      id: taskForm.id || uid(),
    };

    setTasks(list =>
      taskForm.id
        ? list.map(item => item.id === taskForm.id ? task : item)
        : [...list, task]
    );

    setSelectedDate(task.date);

    const [year, month] = task.date.split('-').map(Number);
    setViewYear(year);
    setViewMonth(month - 1);

    say(taskForm.id ? 'Evento atualizado' : 'Evento adicionado');
    setTaskForm(null);
  };

  const deleteTask = (task: Task) => {
    if (!confirm(`Excluir "${task.title}"?`)) return;

    setTasks(list => list.filter(item => item.id !== task.id));
    setTaskForm(null);
    say('Evento excluído');
  };

  const toggleTask = (task: Task) => {
    setTasks(list =>
      list.map(item =>
        item.id === task.id
          ? { ...item, done: !item.done }
          : item
      )
    );

    say(task.done ? 'Evento reaberto' : 'Evento concluído');
  };

  return (
    <>
      <Head
        title={tab === 'notes' ? 'Notas' : 'Calendário'}
        action={
          <Btn
            onClick={() => {
              if (tab === 'notes') {
                setViewingNote(null);
                setEditingNote(blankNote());
              } else {
                setTaskForm(blankTask(selectedDate));
              }
            }}
            aria-label={tab === 'notes' ? 'Criar nota' : 'Adicionar evento'}
            className="!px-0 w-12"
          >
            <Plus size={23} />
          </Btn>
        }
      />

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-sf p-1 mb-5">
        <button
          type="button"
          onClick={() => setTab('notes')}
          className={cx(
            'rounded-lg py-2.5 text-sm font-medium transition-colors',
            tab === 'notes' ? 'bg-bg shadow-sm text-tx' : 'text-mu'
          )}
        >
          Notas
        </button>

        <button
          type="button"
          onClick={() => setTab('calendar')}
          className={cx(
            'rounded-lg py-2.5 text-sm font-medium transition-colors',
            tab === 'calendar' ? 'bg-bg shadow-sm text-tx' : 'text-mu'
          )}
        >
          Calendário
        </button>
      </div>

      {tab === 'notes' && (
        <>
          <div className="relative mb-5">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-mu pointer-events-none"
            />
            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar notas"
              aria-label="Buscar notas"
              className="w-full rounded-xl border border-ln bg-sf py-3 pl-10 pr-3 text-sm outline-none focus:border-ac"
            />
          </div>

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-mu">
              {filteredNotes.length}{' '}
              {filteredNotes.length === 1 ? 'nota' : 'notas'}
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch('');
                setEditingNote(blankNote());
                setViewingNote(null);
              }}
              className="text-sm text-ac font-medium"
            >
              Nova nota
            </button>
          </div>

          {filteredNotes.length === 0 ? (
            <Empty
              text={
                search
                  ? 'Nenhuma nota encontrada.'
                  : 'Tu ainda não criou nenhuma nota.'
              }
              action={
                <Btn onClick={() => setEditingNote(blankNote())}>
                  <Plus size={18} />
                  Criar nota
                </Btn>
              }
            />
          ) : (
            <div className="space-y-6">
              {noteGroups.map(group => (
                <section key={group.title}>
                  <h3 className="text-sm font-semibold text-mu mb-3">
                    {group.title}
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    {group.notes.map(note => (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => openNote(note)}
                        className="min-w-0 text-left rounded-xl border border-ln bg-sf p-3 transition-colors hover:border-ac flex flex-col min-h-36"
                      >
                        <div className="flex items-center gap-2 mb-3 text-ac">
                          <FileText size={17} />
                          <span className="text-xs text-mu truncate">
                            {formatNoteDate(note.updatedAt)}
                          </span>
                        </div>

                        <p className="font-semibold text-sm leading-5 break-words line-clamp-3">
                          {note.title || 'Nova Nota'}
                        </p>

                        <p className="text-xs text-mu mt-2 whitespace-pre-wrap break-words line-clamp-5">
                          {note.content || 'Sem texto'}
                        </p>

                        <p className="text-xs text-mu mt-auto pt-3">
                          {note.content.trim()
                            ? `${note.content.trim().length} caracteres`
                            : 'Nota vazia'}
                        </p>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'calendar' && (
        <>
          <Card className="!p-4 mb-5">
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
                    const now = new Date();
                    setViewYear(now.getFullYear());
                    setViewMonth(now.getMonth());
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
                  return <div key={`empty-${index}`} className="min-h-10" />;
                }

                const date = dateKey(viewYear, viewMonth, day);
                const dayTasks = tasks.filter(task => task.date === date);
                const selected = date === selectedDate;
                const isToday = date === today();

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={cx(
                      'relative flex flex-col items-center justify-center rounded-xl min-h-10 gap-1 transition-colors',
                      selected
                        ? 'bg-ac text-on font-semibold'
                        : isToday
                          ? 'border border-ac'
                          : 'hover:bg-sf'
                    )}
                    aria-label={`${day} de ${MONTHS[viewMonth]}, ${dayTasks.length} eventos`}
                    aria-pressed={selected}
                  >
                    <span className="text-sm">{day}</span>

                    {dayTasks.length > 0 && (
                      <span className="flex gap-0.5 items-center justify-center">
                        {dayTasks.slice(0, 3).map((task, taskIndex) => (
                          <span
                            key={task.id || taskIndex}
                            className="size-1 rounded-full"
                            style={{
                              background: selected ? 'currentColor' : 'var(--ac)',
                            }}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="font-semibold">Eventos</h3>
              <p className="text-sm text-mu">{formatDate(selectedDate)}</p>
            </div>

            <Btn onClick={() => setTaskForm(blankTask(selectedDate))}>
              <Plus size={18} />
              Adicionar
            </Btn>
          </div>

          {selectedTasks.length === 0 ? (
            <Empty
              text="Nenhum evento neste dia."
              action={
                <Btn onClick={() => setTaskForm(blankTask(selectedDate))}>
                  <CalendarDays size={18} />
                  Criar evento
                </Btn>
              }
            />
          ) : (
            <div className="space-y-2">
              {selectedTasks.map(task => (
                <Card key={task.id} className="!p-3">
                  <button
                    type="button"
                    onClick={() => setTaskForm({ ...task })}
                    className="w-full text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center rounded-xl shrink-0 size-10 bg-sf text-ac">
                        <CalendarDays size={20} />
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
                          {task.priority > 0 &&
                            ` · Prioridade ${PRI[task.priority].toLowerCase()}`}
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

                      <ChevronRight size={18} className="text-mu shrink-0 mt-1" />
                    </div>
                  </button>

                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => toggleTask(task)}
                      className="text-xs text-mu underline px-2 py-1"
                    >
                      {task.done ? 'Marcar pendente' : 'Marcar concluído'}
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {editingNote && (
        <Sheet
          title={viewingNote ? 'Editar nota' : 'Nova nota'}
          onClose={() => {
            setEditingNote(null);
            setViewingNote(null);
          }}
        >
          <Field
            label="Título"
            value={editingNote.title}
            onChange={event =>
              setEditingNote({ ...editingNote, title: event.target.value })
            }
            placeholder="Título da nota"
            autoFocus
          />

          <label className="block text-sm font-medium mb-2 mt-4">
            Texto
          </label>

          <textarea
            value={editingNote.content}
            onChange={event =>
              setEditingNote({ ...editingNote, content: event.target.value })
            }
            placeholder="Comece a escrever..."
            rows={12}
            className="w-full resize-y rounded-xl border border-ln bg-sf p-3 text-sm outline-none focus:border-ac"
          />

          <p className="text-xs text-mu mt-2">
            Última edição: {formatNoteDate(editingNote.updatedAt)}
          </p>

          <Btn
            className="w-full mt-4"
            onClick={saveNote}
            disabled={!editingNote.title.trim() && !editingNote.content.trim()}
          >
            Salvar nota
          </Btn>

          {editingNote.id && (
            <Btn
              variant="danger"
              className="w-full mt-3"
              onClick={() => deleteNote(editingNote)}
            >
              <Trash2 size={18} />
              Excluir nota
            </Btn>
          )}
        </Sheet>
      )}

      {taskForm && (
        <Sheet
          title={taskForm.id ? 'Editar evento' : 'Novo evento'}
          onClose={() => setTaskForm(null)}
        >
          <Field
            label="Título"
            value={taskForm.title}
            onChange={event =>
              setTaskForm({ ...taskForm, title: event.target.value })
            }
            placeholder="Ex.: Prova, aniversário, consulta..."
            autoFocus
          />

          <Field
            label="Data"
            type="date"
            value={taskForm.date}
            onChange={event =>
              setTaskForm({ ...taskForm, date: event.target.value })
            }
          />

          <Field
            label="Horário (opcional)"
            type="time"
            value={taskForm.time}
            onChange={event =>
              setTaskForm({ ...taskForm, time: event.target.value })
            }
          />

          <Sel
            label="Categoria"
            value={taskForm.category}
            onChange={event =>
              setTaskForm({ ...taskForm, category: event.target.value })
            }
          >
            {CATS.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Sel>

          <Sel
            label="Prioridade"
            value={taskForm.priority}
            onChange={event =>
              setTaskForm({
                ...taskForm,
                priority: Number(event.target.value) as 0 | 1 | 2,
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
            className="w-full mt-4"
            onClick={saveTask}
            disabled={!taskForm.title.trim() || !taskForm.date}
          >
            Salvar evento
          </Btn>

          {taskForm.id && (
            <Btn
              variant="danger"
              className="w-full mt-3"
              onClick={() => deleteTask(taskForm)}
            >
              <Trash2 size={18} />
              Excluir evento
            </Btn>
          )}
        </Sheet>
      )}
    </>
  );
}
