-- Execute no SQL Editor do projeto Supabase. Não altera tabelas de notificações.
create table if not exists public.azyrus_rate_limits (
  bucket text primary key,
  window_start timestamptz not null,
  attempts integer not null
);
alter table public.azyrus_rate_limits enable row level security;
revoke all on public.azyrus_rate_limits from public, anon, authenticated;
create or replace function public.azyrus_rate_limit(p_bucket text, p_maximum integer, p_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if (p_bucket not in ('login', 'ai') and p_bucket !~ '^login:[0-9a-f]{64}$') or p_maximum < 1 or p_seconds < 1 then return false; end if;
  insert into public.azyrus_rate_limits as r (bucket, window_start, attempts)
  values (p_bucket, now(), 1)
  on conflict (bucket) do update set
    window_start = case when r.window_start <= now() - make_interval(secs => p_seconds) then now() else r.window_start end,
    attempts = case when r.window_start <= now() - make_interval(secs => p_seconds) then 1 else r.attempts + 1 end
  returning attempts into n;
  return n <= p_maximum;
end $$;
revoke all on function public.azyrus_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.azyrus_rate_limit(text, integer, integer) to service_role;
