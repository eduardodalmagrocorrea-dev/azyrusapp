import { useState } from 'react';
import { Btn, Field } from './ui';

const PASSWORD = '123456';

export default function PasswordGate({
  onUnlock,
}: {
  onUnlock: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const enter = () => {
    if (password === PASSWORD) {
      localStorage.setItem('azyrus-authenticated', 'true');
      onUnlock();
      return;
    }

    setError('Senha incorreta.');
    setPassword('');
  };

  return (
    <div className="h-dvh grid place-items-center px-6">
      <div className="w-full max-w-md">
        <p className="text-sm tracking-[.3em] text-ac mb-8">
          AZYRUS
        </p>

        <h1 className="text-3xl font-light mb-2">
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
          <p className="text-sm text-red-400 mt-2">
            {error}
          </p>
        )}

        <Btn className="w-full mt-4" onClick={enter}>
          Entrar
        </Btn>
      </div>
    </div>
  );
}