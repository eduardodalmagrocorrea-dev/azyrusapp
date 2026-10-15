
import { useRef, useState } from 'react';
import {
  Plus, Trash2, Camera, ImagePlus, ArrowLeft, Ruler,
  ChartNoAxesCombined, NotebookPen, CalendarDays, Pencil,
  ChevronRight, X
} from 'lucide-react';
import type { Goal, PhysicalRecord, Setter } from '../types';
import { Bar, Btn, Card, Empty, Field, Head, Sel, Sheet } from '../ui';
import { fmtDate, fmtNum, goalPct, num, uid } from '../utils';

const CATS = ['Pessoal', 'Finanças', 'Estudos', 'Saúde', 'Físico', 'Trabalho', 'Outro'];

type P = {
  goals: Goal[];
  setGoals: Setter<Goal[]>;
  say: (m: string) => void;
};

type Draft = {
  g: Goal;
  start: string;
  current: string;
  target: string;
};

type PhysicalDraft = {
  date: string;
  weight: string;
  chest: string;
  waist: string;
  arm: string;
  leg: string;
  bodyFat: string;
  note: string;
  photo: string;
};

type Section = 'overview' | 'photos' | 'measures' | 'diary';

const today = () => new Date().toLocaleDateString('en-CA');

const blank = (): Goal => ({
  id: '',
  title: '',
  desc: '',
  image: '',
  due: '',
  category: 'Pessoal',
  status: 'ativa',
  tracked: false,
  unit: '',
  start: 0,
  current: 0,
  target: 100,
  pct: 0
});

const draft = (g: Goal): Draft => ({
  g,
  start: String(g.start),
  current: String(g.current),
  target: String(g.target)
});

const emptyPhysical = (): PhysicalDraft => ({
  date: today(),
  weight: '',
  chest: '',
  waist: '',
  arm: '',
  leg: '',
  bodyFat: '',
  note: '',
  photo: ''
});

const recordDraft = (r?: PhysicalRecord): PhysicalDraft => ({
  date: r?.date || today(),
  weight: r?.weight == null ? '' : String(r.weight),
  chest: r?.chest == null ? '' : String(r.chest),
  waist: r?.waist == null ? '' : String(r.waist),
  arm: r?.arm == null ? '' : String(r.arm),
  leg: r?.leg == null ? '' : String(r.leg),
  bodyFat: r?.bodyFat == null ? '' : String(r.bodyFat),
  note: r?.note || '',
  photo: r?.photo || ''
});

const dateLabel = (date: string) => {
  if (!date) return 'Sem data';
  return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR');
};

const numeric = (v: string): number | undefined => {
  if (!v.trim()) return undefined;
  const n = num(v);
  return Number.isFinite(n) ? n : undefined;
};

export default function Goals({ goals, setGoals, say }: P) {
  const [d, setD] = useState<Draft | null>(null);
  const [physicalGoalId, setPhysicalGoalId] = useState<string | null>(null);
  const [section, setSection] = useState<Section>('overview');
  const [record, setRecord] = useState<PhysicalDraft | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recordFileRef = useRef<HTMLInputElement>(null);

  const physicalGoal = goals.find(g => g.id === physicalGoalId) || null;
  const records = [...(physicalGoal?.physicalRecords || [])]
    .sort((a, b) => b.date.localeCompare(a.date));

  const save = () => {
    if (!d || !d.g.title.trim()) return;

    const g: Goal = {
      ...d.g,
      title: d.g.title.trim(),
      start: num(d.start),
      current: num(d.current),
      target: num(d.target)
    };

    setGoals(l =>
      g.id
        ? l.map(x => x.id === g.id ? g : x)
        : [...l, { ...g, id: uid() }]
    );

    say(g.status === 'concluída' ? 'Meta concluída' : 'Meta salva');
    setD(null);
  };

  const remove = (g: Goal) => {
    if (confirm(`Excluir "${g.title}"?`)) {
      setGoals(l => l.filter(x => x.id !== g.id));
      if (physicalGoalId === g.id) setPhysicalGoalId(null);
      setD(null);
    }
  };

  const set = (p: Partial<Goal>) => {
    if (d) setD({ ...d, g: { ...d.g, ...p } });
  };

  const chooseImage = () => fileRef.current?.click();

  const openPhysical = (g: Goal) => {
    setPhysicalGoalId(g.id);
    setSection('overview');
    setRecord(null);
    setEditingRecordId(null);
  };

  const updatePhysicalGoal = (id: string, update: (g: Goal) => Goal) => {
    setGoals(list => list.map(g => g.id === id ? update(g) : g));
  };

  const saveRecord = () => {
    if (!physicalGoal || !record || !record.date) {
      say('Informe a data do registro');
      return;
    }

    const newRecord: PhysicalRecord = {
      id: editingRecordId || uid(),
      date: record.date,
      weight: numeric(record.weight),
      chest: numeric(record.chest),
      waist: numeric(record.waist),
      arm: numeric(record.arm),
      leg: numeric(record.leg),
      bodyFat: numeric(record.bodyFat),
      note: record.note.trim(),
      photo: record.photo || undefined
    };

    updatePhysicalGoal(physicalGoal.id, g => {
      const previous = g.physicalRecords || [];
      const next = editingRecordId
        ? previous.map(r => r.id === editingRecordId ? newRecord : r)
        : [...previous, newRecord];

      const latest = [...next].sort((a, b) => b.date.localeCompare(a.date))[0];
      const currentWeight = latest?.weight;

      return {
        ...g,
        physicalRecords: next,
        ...(currentWeight !== undefined
          ? { tracked: true, unit: 'kg', current: currentWeight }
          : {})
      };
    });

    say(editingRecordId ? 'Registro atualizado' : 'Progresso registrado');
    setRecord(null);
    setEditingRecordId(null);
  };

  const deleteRecord = (id: string) => {
    if (!physicalGoal) return;

    updatePhysicalGoal(physicalGoal.id, g => {
      const next = (g.physicalRecords || []).filter(r => r.id !== id);
      const latest = [...next].sort((a, b) => b.date.localeCompare(a.date))[0];
      const currentWeight = latest?.weight;

      return {
        ...g,
        physicalRecords: next,
        ...(currentWeight !== undefined
          ? { tracked: true, unit: 'kg', current: currentWeight }
          : {})
      };
    });

    setRecordToDelete(null);
    say('Registro excluído');
  };

  const editRecord = (r: PhysicalRecord) => {
    setEditingRecordId(r.id);
    setRecord(recordDraft(r));
  };

  const recordPhoto = () => recordFileRef.current?.click();

  const recordCount = records.length;
  const measureCount = records.filter(r =>
    r.weight != null || r.chest != null || r.waist != null ||
    r.arm != null || r.leg != null || r.bodyFat != null
  ).length;

  const metric = (label: string, key: keyof PhysicalRecord, unit: string) => {
    const values = records.filter(r => typeof r[key] === 'number');
    const latest = values[0];
    const oldest = values[values.length - 1];
    const difference =
      latest && oldest && typeof latest[key] === 'number' && typeof oldest[key] === 'number'
        ? (latest[key] as number) - (oldest[key] as number)
        : null;

    return (
      <Card key={label} className="!p-3">
        <p className="text-sm text-mu">{label}</p>
        <p className="text-xl font-medium mt-1">
          {latest ? `${fmtNum(latest[key] as number)} ${unit}` : '—'}
        </p>
        {difference !== null && values.length > 1 && (
          <p className="text-xs text-mu mt-1">
            {difference > 0 ? '+' : ''}{fmtNum(difference)} {unit} desde o primeiro registro
          </p>
        )}
        {latest && (
          <p className="text-xs text-mu mt-1">{dateLabel(latest.date)}</p>
        )}
      </Card>
    );
  };

  return (
    <>
      {!physicalGoal && (
        <>
          <Head
            title="Metas"
            action={
              <Btn
                onClick={() => setD(draft(blank()))}
                aria-label="Nova meta"
                className="!px-0 w-12"
              >
                <Plus size={22} />
              </Btn>
            }
          />

          {goals.length === 0 && (
            <Empty
              text="Defina o que você quer alcançar."
              action={<Btn onClick={() => setD(draft(blank()))}>Criar meta</Btn>}
            />
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '16px',
              width: '100%',
              alignItems: 'start'
            }}
          >
            {goals.map(g => (
              <div key={g.id} style={{ minWidth: 0, width: '100%' }}>
                <Card
                  onClick={() => g.category === 'Físico' ? openPhysical(g) : setD(draft(g))}
                  className="!w-full !min-w-0"
                >
                  {g.image ? (
                    <img
                      src={g.image}
                      alt=""
                      style={{
                        width: '100%',
                        height: 176,
                        objectFit: 'cover',
                        borderRadius: 12,
                        marginBottom: 12
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: 176,
                        borderRadius: 12,
                        marginBottom: 12,
                        background: 'var(--sf)',
                        border: '1px dashed var(--ln)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        color: 'var(--mu)'
                      }}
                    >
                      <ImagePlus size={30} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        Adicione uma foto
                      </span>
                      <span style={{ fontSize: 11, opacity: 0.8 }}>
                        Clique para personalizar sua meta
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-start gap-2">
                    <p className="font-medium break-words">{g.title}</p>
                    <span className="text-sm text-mu shrink-0">
                      {Math.round(goalPct(g))}%
                    </span>
                  </div>

                  <div className="my-3">
                    <Bar pct={goalPct(g)} />
                  </div>

                  <p className="text-sm text-mu break-words">
                    {g.category === 'Físico'
                      ? `${g.physicalRecords?.length || 0} registros de evolução`
                      : g.tracked
                        ? `${g.unit} ${fmtNum(g.current)} / ${g.unit} ${fmtNum(g.target)}`.replaceAll('  ', ' ')
                        : g.category}
                    {g.due && ` · até ${fmtDate(g.due)}`}
                    {g.status === 'concluída' && ' · Concluída'}
                  </p>

                  {g.category === 'Físico' && (
                    <div className="flex items-center justify-end gap-1 text-sm text-mu mt-3">
                      Acompanhar evolução <ChevronRight size={16} />
                    </div>
                  )}
                </Card>
              </div>
            ))}
          </div>
        </>
      )}

      {physicalGoal && (
        <>
          <div className="flex items-center gap-2 mb-5">
            <Btn
              variant="ghost"
              className="!px-3"
              onClick={() => {
                setPhysicalGoalId(null);
                setRecord(null);
              }}
            >
              <ArrowLeft size={18} />
              Metas
            </Btn>
            <div className="flex-1" />
            <Btn
              variant="ghost"
              className="!px-3"
              onClick={() => setD(draft(physicalGoal))}
            >
              <Pencil size={17} />
              Editar
            </Btn>
          </div>

          <div className="mb-6">
            <p className="text-xs uppercase tracking-widest text-mu mb-2">Meta física</p>
            <h1 className="text-3xl font-light tracking-tight break-words">{physicalGoal.title}</h1>
            {physicalGoal.desc && (
              <p className="text-sm text-mu mt-2">{physicalGoal.desc}</p>
            )}
            {physicalGoal.due && (
              <p className="text-sm text-mu mt-2">Prazo: {fmtDate(physicalGoal.due)}</p>
            )}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-mu">Progresso da meta</span>
                <span>{Math.round(goalPct(physicalGoal))}%</span>
              </div>
              <Bar pct={goalPct(physicalGoal)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <Card className="!p-4">
              <Camera size={20} className="text-mu mb-3" />
              <p className="text-2xl font-medium">{recordCount}</p>
              <p className="text-sm text-mu mt-1">Registros no total</p>
            </Card>
            <Card className="!p-4">
              <Ruler size={20} className="text-mu mb-3" />
              <p className="text-2xl font-medium">{measureCount}</p>
              <p className="text-sm text-mu mt-1">Registros de medidas</p>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {([
              { id: 'overview', title: 'Visão geral', subtitle: 'Resumo e histórico', icon: ChartNoAxesCombined },
              { id: 'photos', title: 'Fotos', subtitle: 'Comparação visual', icon: Camera },
              { id: 'measures', title: 'Medidas', subtitle: 'Peso e medidas', icon: Ruler },
              { id: 'diary', title: 'Diário', subtitle: 'Notas por data', icon: NotebookPen }
            ] as const).map(item => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`!p-4 ${section === item.id ? 'border-ac' : ''}`}
                >
                  <Icon size={21} className="text-mu mb-3" />
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-mu mt-1">{item.subtitle}</p>
                </Card>
              );
            })}
          </div>

          {section === 'overview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-medium">Histórico</h2>
                  <p className="text-sm text-mu mt-1">Sua evolução organizada por data.</p>
                </div>
                <Btn onClick={() => {
                  setEditingRecordId(null);
                  setRecord(emptyPhysical());
                }}>
                  <Plus size={18} />
                  Registrar
                </Btn>
              </div>

              {records.length === 0 ? (
                <Empty
                  text="Sua evolução começa com o primeiro registro."
                  action={<Btn onClick={() => {
                    setEditingRecordId(null);
                    setRecord(emptyPhysical());
                  }}>Adicionar primeiro registro</Btn>}
                />
              ) : (
                <div className="space-y-3">
                  {records.map(r => (
                    <Card key={r.id} className="!p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{dateLabel(r.date)}</p>
                          <p className="text-sm text-mu mt-1">
                            {[
                              r.weight != null ? `${fmtNum(r.weight)} kg` : '',
                              r.waist != null ? `Cintura ${fmtNum(r.waist)} cm` : '',
                              r.arm != null ? `Braço ${fmtNum(r.arm)} cm` : ''
                            ].filter(Boolean).join(' · ') || 'Registro sem medidas'}
                          </p>
                        </div>
                        <Btn variant="ghost" className="!px-3" onClick={() => editRecord(r)}>
                          <Pencil size={16} />
                        </Btn>
                      </div>
                      {r.photo && (
                        <img src={r.photo} alt={`Progresso de ${dateLabel(r.date)}`} className="w-full max-h-64 object-cover rounded-xl mt-3" />
                      )}
                      {r.note && <p className="text-sm mt-3 whitespace-pre-wrap">{r.note}</p>}
                      <button
                        type="button"
                        className="text-sm text-mu underline mt-3"
                        onClick={() => setRecordToDelete(r.id)}
                      >
                        Excluir registro
                      </button>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'photos' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-medium">Fotos de evolução</h2>
                <p className="text-sm text-mu mt-1">Registre fotos em datas diferentes para comparar sua evolução.</p>
              </div>
              <Btn className="w-full" onClick={() => {
                setEditingRecordId(null);
                setRecord(emptyPhysical());
                setSection('photos');
              }}>
                <Camera size={18} />
                Adicionar foto
              </Btn>
              {records.filter(r => r.photo).length === 0 ? (
                <Empty text="As fotos registradas aparecerão aqui, em ordem de data." />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {records.filter(r => r.photo).map(r => (
                    <Card key={r.id} className="!p-2" onClick={() => editRecord(r)}>
                      <img src={r.photo} alt={`Foto de ${dateLabel(r.date)}`} className="w-full h-48 object-cover rounded-xl" />
                      <p className="text-sm font-medium mt-2">{dateLabel(r.date)}</p>
                      <p className="text-xs text-mu mt-1">Abrir registro</p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'measures' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-medium">Peso e medidas</h2>
                <p className="text-sm text-mu mt-1">Os valores mais recentes e a diferença desde o primeiro registro.</p>
              </div>

              <Btn className="w-full" onClick={() => {
                setEditingRecordId(null);
                setRecord(emptyPhysical());
              }}>
                <Plus size={18} />
                Registrar medidas
              </Btn>

              <div className="grid grid-cols-2 gap-3">
                {metric('Peso', 'weight', 'kg')}
                {metric('Peito', 'chest', 'cm')}
                {metric('Cintura', 'waist', 'cm')}
                {metric('Braço', 'arm', 'cm')}
                {metric('Perna', 'leg', 'cm')}
                {metric('Gordura corporal', 'bodyFat', '%')}
              </div>

              <h3 className="text-lg font-medium pt-2">Histórico de medidas</h3>
              {records.filter(r =>
                r.weight != null || r.chest != null || r.waist != null ||
                r.arm != null || r.leg != null || r.bodyFat != null
              ).length === 0 ? (
                <Empty text="Adicione suas primeiras medidas para começar o histórico." />
              ) : records.filter(r =>
                r.weight != null || r.chest != null || r.waist != null ||
                r.arm != null || r.leg != null || r.bodyFat != null
              ).map(r => (
                <Card key={r.id} className="!p-4" onClick={() => editRecord(r)}>
                  <div className="flex justify-between items-center">
                    <p className="font-medium">{dateLabel(r.date)}</p>
                    <Pencil size={16} className="text-mu" />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 text-sm">
                    {([
                      ['Peso', r.weight, 'kg'],
                      ['Peito', r.chest, 'cm'],
                      ['Cintura', r.waist, 'cm'],
                      ['Braço', r.arm, 'cm'],
                      ['Perna', r.leg, 'cm'],
                      ['Gordura', r.bodyFat, '%']
                    ] as [string, number | undefined, string][]).filter(v => v[1] != null).map(([label, value, unit]) => (
                      <p key={label} className="text-mu">{label}: <span className="text-tx">{fmtNum(value!)} {unit}</span></p>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {section === 'diary' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-medium">Diário de progresso</h2>
                <p className="text-sm text-mu mt-1">Registre como você está se sentindo e o que mudou.</p>
              </div>
              <Btn className="w-full" onClick={() => {
                setEditingRecordId(null);
                setRecord(emptyPhysical());
              }}>
                <Plus size={18} />
                Nova anotação
              </Btn>
              {records.filter(r => r.note?.trim()).length === 0 ? (
                <Empty text="Suas anotações aparecerão aqui, organizadas por data." />
              ) : records.filter(r => r.note?.trim()).map(r => (
                <Card key={r.id} className="!p-4" onClick={() => editRecord(r)}>
                  <div className="flex items-center gap-2 text-sm text-mu mb-2">
                    <CalendarDays size={16} />
                    {dateLabel(r.date)}
                  </div>
                  <p className="whitespace-pre-wrap break-words">{r.note}</p>
                  <p className="text-xs text-mu mt-3">Editar anotação</p>
                </Card>
              ))}
            </div>
          )}

          {physicalGoal.status === 'concluída' && (
            <p className="text-sm text-mu mt-6">Meta concluída. Seu histórico continua disponível.</p>
          )}

          <div className="mt-8 pt-5 border-t border-ln">
            <Btn variant="ghost" className="w-full" onClick={() => setD(draft(physicalGoal))}>
              <Pencil size={17} />
              Editar detalhes da meta
            </Btn>
            <Btn variant="danger" className="w-full mt-3" onClick={() => remove(physicalGoal)}>
              <Trash2 size={17} />
              Excluir meta
            </Btn>
          </div>
        </>
      )}

      {d && (
        <Sheet title={d.g.id ? 'Editar meta' : 'Nova meta'} onClose={() => setD(null)}>
          <Field
            label="Nome"
            value={d.g.title}
            onChange={e => set({ title: e.target.value })}
            placeholder="Ex.: Shape dos sonhos"
            autoFocus
          />

          <div className="mb-4">
            <label className="block text-sm text-mu mb-2">Foto da meta</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === 'string') set({ image: reader.result });
                };
                reader.readAsDataURL(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={chooseImage}
              className="w-full text-left rounded-xl p-3 transition-opacity hover:opacity-80"
              style={{ border: '1px dashed var(--ac)', background: 'var(--sf)', color: 'var(--tx)' }}
            >
              {d.g.image ? (
                <>
                  <img src={d.g.image} alt="Prévia da foto da meta" className="w-full h-40 object-cover rounded-lg mb-3" />
                  <span className="flex items-center justify-center gap-2 text-sm font-medium">
                    <Camera size={18} /> Trocar foto
                  </span>
                </>
              ) : (
                <span className="flex flex-col items-center justify-center gap-2 py-5">
                  <Camera size={25} />
                  <span className="font-semibold">Adicionar foto à meta</span>
                  <span className="text-sm text-mu">Escolha uma imagem do dispositivo</span>
                </span>
              )}
            </button>
            {d.g.image && (
              <button type="button" onClick={() => set({ image: '' })} className="text-sm mt-2 underline text-mu">
                Remover foto
              </button>
            )}
          </div>

          <Field label="Descrição (opcional)" value={d.g.desc} onChange={e => set({ desc: e.target.value })} />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Prazo" type="date" value={d.g.due} onChange={e => set({ due: e.target.value })} />
            <Sel
              label="Categoria"
              value={d.g.category}
              onChange={e => set({
                category: e.target.value,
                ...(e.target.value === 'Físico' ? { tracked: false } : {})
              })}
            >
              {CATS.map(c => <option key={c}>{c}</option>)}
            </Sel>
          </div>

          {d.g.category === 'Físico' && (
            <div className="rounded-xl border border-ln p-3 mb-4">
              <p className="font-medium text-sm">Acompanhamento físico</p>
              <p className="text-sm text-mu mt-1">
                Depois de salvar, abra esta meta para registrar fotos, peso, medidas e anotações ao longo do tempo.
              </p>
            </div>
          )}

          {d.g.category !== 'Físico' && (
            <>
              <label className="flex items-center gap-3 min-h-11 mb-2">
                <input
                  type="checkbox"
                  className="size-5 accent-[var(--ac)]"
                  checked={d.g.tracked}
                  onChange={e => set({ tracked: e.target.checked })}
                />
                Tem valores numéricos
              </label>

              {d.g.tracked ? (
                <>
                  <Field label="Unidade (ex.: R$, kg, livros)" value={d.g.unit} onChange={e => set({ unit: e.target.value })} />
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Inicial" inputMode="decimal" value={d.start} onChange={e => setD({ ...d, start: e.target.value })} />
                    <Field label="Atual" inputMode="decimal" value={d.current} onChange={e => setD({ ...d, current: e.target.value })} />
                    <Field label="Final" inputMode="decimal" value={d.target} onChange={e => setD({ ...d, target: e.target.value })} />
                  </div>
                </>
              ) : (
                <label className="block mb-3">
                  <span className="text-sm text-mu">Progresso: {d.g.pct}%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={d.g.pct}
                    onChange={e => set({ pct: Number(e.target.value) })}
                    className="w-full h-11 accent-[var(--ac)]"
                  />
                </label>
              )}
            </>
          )}

          <Sel label="Status" value={d.g.status} onChange={e => set({ status: e.target.value as Goal['status'] })}>
            <option value="ativa">Ativa</option>
            <option value="concluída">Concluída</option>
          </Sel>

          <Btn className="w-full mt-2" onClick={save} disabled={!d.g.title.trim()}>
            Salvar meta
          </Btn>

          {d.g.id && (
            <Btn variant="danger" className="w-full mt-3" onClick={() => remove(d.g)}>
              <Trash2 size={18} />
              Excluir
            </Btn>
          )}
        </Sheet>
      )}

      {record && physicalGoal && (
        <Sheet
          title={editingRecordId ? 'Editar registro' : 'Registrar evolução'}
          onClose={() => {
            setRecord(null);
            setEditingRecordId(null);
          }}
        >
          <p className="text-sm text-mu mb-4">
            {physicalGoal.title} · preencha somente os dados que deseja registrar.
          </p>

          <Field label="Data do registro" type="date" value={record.date} onChange={e => setRecord({ ...record, date: e.target.value })} />

          <h3 className="font-medium mb-3 mt-5">Medidas corporais</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Peso (kg)" inputMode="decimal" placeholder="Ex.: 70,5" value={record.weight} onChange={e => setRecord({ ...record, weight: e.target.value })} />
            <Field label="Gordura corporal (%)" inputMode="decimal" placeholder="Opcional" value={record.bodyFat} onChange={e => setRecord({ ...record, bodyFat: e.target.value })} />
            <Field label="Peito (cm)" inputMode="decimal" value={record.chest} onChange={e => setRecord({ ...record, chest: e.target.value })} />
            <Field label="Cintura (cm)" inputMode="decimal" value={record.waist} onChange={e => setRecord({ ...record, waist: e.target.value })} />
            <Field label="Braço (cm)" inputMode="decimal" value={record.arm} onChange={e => setRecord({ ...record, arm: e.target.value })} />
            <Field label="Perna (cm)" inputMode="decimal" value={record.leg} onChange={e => setRecord({ ...record, leg: e.target.value })} />
          </div>

          <h3 className="font-medium mb-3 mt-5">Foto de progresso</h3>
          <input
            ref={recordFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === 'string') setRecord(prev => prev ? { ...prev, photo: reader.result as string } : prev);
              };
              reader.readAsDataURL(file);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            onClick={recordPhoto}
            className="w-full rounded-xl border border-ln p-3 text-left"
          >
            {record.photo ? (
              <>
                <img src={record.photo} alt="Prévia da foto" className="w-full max-h-64 object-cover rounded-lg" />
                <span className="flex items-center justify-center gap-2 text-sm mt-3">
                  <Camera size={17} /> Trocar foto
                </span>
              </>
            ) : (
              <span className="flex items-center gap-3 py-2">
                <ImagePlus size={25} className="text-mu" />
                <span>
                  <span className="block font-medium">Adicionar foto</span>
                  <span className="block text-sm text-mu mt-1">Opcional</span>
                </span>
              </span>
            )}
          </button>
          {record.photo && (
            <Btn variant="ghost" className="w-full mt-2" onClick={() => setRecord({ ...record, photo: '' })}>
              <X size={17} /> Remover foto
            </Btn>
          )}

          <h3 className="font-medium mb-3 mt-5">Diário</h3>
          <label className="block mb-4">
            <span className="text-sm text-mu">Anotações deste dia</span>
            <textarea
              value={record.note}
              onChange={e => setRecord({ ...record, note: e.target.value })}
              placeholder="Como foi sua semana? O que mudou?"
              rows={4}
              className="mt-1 w-full rounded-xl bg-bg border border-ln p-3 text-tx focus:outline-2 focus:outline-ac resize-y"
            />
          </label>

          <Btn className="w-full" onClick={saveRecord} disabled={!record.date}>
            {editingRecordId ? 'Salvar alterações' : 'Salvar registro'}
          </Btn>

          {editingRecordId && (
            <Btn
              variant="danger"
              className="w-full mt-3"
              onClick={() => setRecordToDelete(editingRecordId)}
            >
              <Trash2 size={17} /> Excluir registro
            </Btn>
          )}
        </Sheet>
      )}

      {recordToDelete && (
        <Sheet title="Excluir registro?" onClose={() => setRecordToDelete(null)}>
          <p className="text-sm text-mu mb-5">
            Este registro será removido do histórico da meta. Essa ação não pode ser desfeita.
          </p>
          <Btn variant="danger" className="w-full" onClick={() => deleteRecord(recordToDelete)}>
            <Trash2 size={17} /> Confirmar exclusão
          </Btn>
          <Btn variant="ghost" className="w-full mt-3" onClick={() => setRecordToDelete(null)}>
            Cancelar
          </Btn>
        </Sheet>
      )}
    </>
  );
}
