-- One revocable, read-only calendar capability per customer. Raw links are never stored here.
create table public.xoot_calendar_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text unique check (token_hash ~ '^[0-9a-f]{64}$'),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  fetch_window timestamptz not null default now(),
  fetch_count integer not null default 0 check (fetch_count >= 0),
  check (expires_at > issued_at and expires_at <= issued_at + interval '366 days'),
  check (token_hash is not null or revoked_at is not null)
);
alter table public.xoot_calendar_subscriptions enable row level security;
revoke all on public.xoot_calendar_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on public.xoot_calendar_subscriptions to service_role;

-- The service role still has to present the capability hash. A single transaction binds the
-- lookup, revocation/expiry checks, per-link allowance and owner-specific minimal event read.
create function public.xoot_read_calendar_feed(p_hash text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare subscription public.xoot_calendar_subscriptions%rowtype; visits jsonb;
begin
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('state','missing');
  end if;
  select * into subscription from public.xoot_calendar_subscriptions
    where token_hash=p_hash and revoked_at is null and expires_at>now() for update;
  if not found then return jsonb_build_object('state','missing'); end if;
  if subscription.fetch_window>now()-interval '1 minute' and subscription.fetch_count>=6 then
    return jsonb_build_object('state','limited');
  end if;
  update public.xoot_calendar_subscriptions set
    fetch_count=case when fetch_window<=now()-interval '1 minute' then 1 else fetch_count+1 end,
    fetch_window=case when fetch_window<=now()-interval '1 minute' then now() else fetch_window end
    where user_id=subscription.user_id;
  select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'service',b.service,
    'scheduled_at',b.scheduled_at,'duration_hours',b.duration_hours,'status',b.status,
    'updated_at',b.updated_at) order by b.scheduled_at,b.id),'[]'::jsonb) into visits
  from (select id,service,scheduled_at,duration_hours,status,updated_at from public.bookings
    where user_id=subscription.user_id and status<>'draft'
      and scheduled_at>=now()-interval '90 days' and scheduled_at<=now()+interval '366 days'
    order by scheduled_at,id limit 1001) b;
  if jsonb_array_length(visits)>1000 then return jsonb_build_object('state','unavailable'); end if;
  return jsonb_build_object('state','ready','visits',visits);
end $$;
revoke all on function public.xoot_read_calendar_feed(text) from public, anon, authenticated;
grant execute on function public.xoot_read_calendar_feed(text) to service_role;
