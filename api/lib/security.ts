import { createHmac, timingSafeEqual } from 'node:crypto';
import { supabase } from './supabase.js';
import { isIP } from 'node:net';

const COOKIE = '__Host-azyrus_session';
const duration = 60 * 60 * 24 * 30;
const secret = () => process.env.AUTH_SECRET || '';
export function configured() { return Buffer.byteLength(secret()) >= 32 && (process.env.AZYRUS_PASSWORD?.length ?? 0) >= 12; }
function sign(value: string) { return createHmac('sha256', secret()).update(value).digest('base64url'); }
export function equal(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function session(req: any) {
  if (Buffer.byteLength(secret()) < 32) return false;
  const cookie = String(req.headers.cookie || '').split('; ').find((s: string) => s.startsWith(COOKIE + '='));
  const [expires, signature] = (cookie?.slice(COOKIE.length + 1) || '').split('.');
  return /^\d+$/.test(expires || '') && Number(expires) > Date.now() / 1000 && !!signature && equal(signature, sign(expires));
}
export function setSession(res: any) {
  const expires = String(Math.floor(Date.now() / 1000) + duration);
  res.setHeader('Set-Cookie', `${COOKIE}=${expires}.${sign(expires)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${duration}`);
}
export function sameOrigin(req: any) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (typeof origin !== 'string' || typeof host !== 'string') return false;
  try { const url = new URL(origin); return url.protocol === 'https:' && url.host === host; } catch { return false; }
}
// Shared database counter: fail closed when the RPC is unavailable.
export async function limit(bucket: string, maximum: number, seconds: number) {
  const { data, error } = await supabase.rpc('azyrus_rate_limit', { p_bucket: bucket, p_maximum: maximum, p_seconds: seconds });
  if (error || typeof data !== 'boolean') throw new Error('Rate limit unavailable');
  return data;
}

export function loginBucket(req: any) {
  const header = req.headers['x-vercel-forwarded-for'];
  if (typeof header !== 'string') return null;
  const address = header.split(',')[0].trim();
  if (!isIP(address) || Buffer.byteLength(secret()) < 32) return null;
  return 'login:' + createHmac('sha256', secret()).update(address).digest('hex');
}
