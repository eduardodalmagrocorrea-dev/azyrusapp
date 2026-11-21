import { useState } from 'react';
import { Btn, Field } from './ui';


export default function PasswordGate({
  onUnlock,
}: {
  onUnlock: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [busy, setBusy] = useState(false);
  const enter = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const data = await response.json();
      setPassword('');
      if (response.ok && data.authenticated) onUnlock();
      else setError(data.error || 'Não foi possível entrar.');
    } catch { setError('Sem conexão com o servidor.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="h-dvh grid place-items-center px-6">
      <div className="w-full max-w-md">
        <p className="text-sm tracking-[.3em] text-ac mb-8">
          AZYRUS
        </p>

        <h1 className="page-title mb-2">
          Acesso privado
        </h1>

        <p className="text-mu mb-8">
          Digite a senha para acessar o AZYRUS.
        </p>

        <Field
          label="Senha"
          type="password"
          value={password}
          onChange={e => {
            setPassword(e.target.value);
            setError('');
          }}
          autoFocus
        />

        {error && (
          <p className="form-error text-sm mt-2">
            {error}
          </p>
        )}

        <Btn className="w-full mt-4" onClick={enter} disabled={busy}>
          {busy ? 'Entrando...' : 'Entrar'}
        </Btn>
      </div>
    </div>
  );
}