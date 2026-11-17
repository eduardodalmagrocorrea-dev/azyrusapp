import { configured, equal, limit, loginBucket, sameOrigin, session, setSession } from './lib/security.js';
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ authenticated: session(req) });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Origem inválida.' });
  if (!configured()) return res.status(503).json({ error: 'Autenticação ainda não configurada no servidor.' });
  if (typeof req.body?.password !== 'string' || req.body.password.length > 256) return res.status(400).json({ error: 'Dados inválidos.' });
  const bucket = loginBucket(req);
  if (!bucket) return res.status(503).json({ error: 'Não foi possível verificar a origem da conexão.' });
  try {
    if (!await limit(bucket, 10, 900)) return res.status(429).json({ error: 'Muitas tentativas. Tente novamente mais tarde.' });
    if (!equal(req.body.password, process.env.AZYRUS_PASSWORD!)) return res.status(401).json({ error: 'Senha incorreta.' });
    setSession(res);
    return res.status(200).json({ authenticated: true });
  } catch { return res.status(503).json({ error: 'Proteção de acesso indisponível. Tente mais tarde.' }); }
}
