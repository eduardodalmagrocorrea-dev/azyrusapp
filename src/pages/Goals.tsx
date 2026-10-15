
import { useRef, useState } from 'react';
import { Plus, Trash2, Camera, ImagePlus } from 'lucide-react';
import type { Goal, Setter } from '../types';
import { Bar, Btn, Card, Empty, Field, Head, Sel, Sheet } from '../ui';
import { fmtDate, fmtNum, goalPct, num, uid } from '../utils';

const CATS = ['Pessoal', 'Finanças', 'Estudos', 'Saúde', 'Trabalho', 'Outro'];

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

export default function Goals({ goals, setGoals, say }: P) {
  const [d, setD] = useState<Draft | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      setD(null);
    }
  };

  const set = (p: Partial<Goal>) => {
    if (d) setD({ ...d, g: { ...d.g, ...p } });
  };

  const chooseImage = () => fileRef.current?.click();

  return (
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
          action={
            <Btn onClick={() => setD(draft(blank()))}>
              Criar meta
            </Btn>
          }
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
              onClick={() => setD(draft(g))}
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
                {g.tracked
                  ? `${g.unit} ${fmtNum(g.current)} / ${g.unit} ${fmtNum(g.target)}`.replaceAll('  ', ' ')
                  : g.category}
                {g.due && ` · até ${fmtDate(g.due)}`}
                {g.status === 'concluída' && ' · Concluída'}
              </p>
            </Card>
          </div>
        ))}
      </div>

      {d && (
        <Sheet
          title={d.g.id ? 'Editar meta' : 'Nova meta'}
          onClose={() => setD(null)}
        >
          <Field
            label="Nome"
            value={d.g.title}
            onChange={e => set({ title: e.target.value })}
            placeholder="Ex.: Economizar R$ 5.000"
            autoFocus
          />

          <div className="mb-4">
            <label className="block text-sm text-mu mb-2">
              Foto da meta
            </label>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file || !d) return;

                const reader = new FileReader();

                reader.onload = () => {
                  if (typeof reader.result === 'string') {
                    set({ image: reader.result });
                  }
                };

                reader.readAsDataURL(file);
                e.target.value = '';
              }}
            />

            <button
              type="button"
              onClick={chooseImage}
              className="w-full text-left rounded-xl p-3 transition-opacity hover:opacity-80"
              style={{
                border: '1px dashed var(--ac)',
                background: 'var(--sf)',
                color: 'var(--tx)'
              }}
            >
              {d.g.image ? (
                <>
                  <img
                    src={d.g.image}
                    alt="Prévia da foto da meta"
                    className="w-full h-40 object-cover rounded-lg mb-3"
                  />
                  <span className="flex items-center justify-center gap-2 text-sm font-medium">
                    <Camera size={18} />
                    Trocar foto
                  </span>
                </>
              ) : (
                <span className="flex flex-col items-center justify-center gap-2 py-5">
                  <span
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 52,
                      height: 52,
                      background: 'var(--ac)',
                      color: '#fff'
                    }}
                  >
                    <Camera size={25} />
                  </span>
                  <span className="font-semibold">
                    Adicionar foto à meta
                  </span>
                  <span className="text-sm text-mu">
                    Escolha uma imagem do seu dispositivo
                  </span>
                </span>
              )}
            </button>

            {d.g.image && (
              <button
                type="button"
                onClick={() => set({ image: '' })}
                className="text-sm mt-2 underline text-mu"
              >
                Remover foto
              </button>
            )}
          </div>

          <Field
            label="Descrição (opcional)"
            value={d.g.desc}
            onChange={e => set({ desc: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Prazo"
              type="date"
              value={d.g.due}
              onChange={e => set({ due: e.target.value })}
            />

            <Sel
              label="Categoria"
              value={d.g.category}
              onChange={e => set({ category: e.target.value })}
            >
              {CATS.map(c => (
                <option key={c}>{c}</option>
              ))}
            </Sel>
          </div>

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
              <Field
                label="Unidade (ex.: R$, kg, livros)"
                value={d.g.unit}
                onChange={e => set({ unit: e.target.value })}
              />

              <div className="grid grid-cols-3 gap-2">
                <Field
                  label="Inicial"
                  inputMode="decimal"
                  value={d.start}
                  onChange={e => setD({ ...d, start: e.target.value })}
                />

                <Field
                  label="Atual"
                  inputMode="decimal"
                  value={d.current}
                  onChange={e => setD({ ...d, current: e.target.value })}
                />

                <Field
                  label="Final"
                  inputMode="decimal"
                  value={d.target}
                  onChange={e => setD({ ...d, target: e.target.value })}
                />
              </div>
            </>
          ) : (
            <label className="block mb-3">
              <span className="text-sm text-mu">
                Progresso: {d.g.pct}%
              </span>

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

          <Sel
            label="Status"
            value={d.g.status}
            onChange={e => set({ status: e.target.value as Goal['status'] })}
          >
            <option value="ativa">Ativa</option>
            <option value="concluída">Concluída</option>
          </Sel>

          <Btn
            className="w-full mt-2"
            onClick={save}
            disabled={!d.g.title.trim()}
          >
            Salvar meta
          </Btn>

          {d.g.id && (
            <Btn
              variant="danger"
              className="w-full mt-3"
              onClick={() => remove(d.g)}
            >
              <Trash2 size={18} />
              Excluir
            </Btn>
          )}
        </Sheet>
      )}
    </>
  );
}
