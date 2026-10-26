-- MANUAL, DISPOSABLE STAGING FIXTURES ONLY. Never include in a migration or scheduler.
-- Invoke only through the authorised operator explicitly targeting fxmxyabdjqviqbcxmvlp.
-- The normal Auth helper must first verify all four real, consented alias sessions.
-- Supply xoot.test_context as transaction-local JSON using set_config(..., true):
-- projectRef, action (create|cleanup), runTag (xoot-private-journey-<UUID>),
-- customerA, workerA, customerB, workerB (verified Auth user UUIDs),
-- xooterA, xooterB, bookingA, bookingB, jobA, jobB (six NEW fixture UUIDs).
-- No JWT, OTP, password or personal address belongs in that context or this file.
-- The projectRef is an operator guard, not independent proof of the connection's host.
-- First execute inside BEGIN/ROLLBACK to verify the live schema; then use BEGIN/COMMIT.
-- Artificial background status models the positive guard ONLY. It proves no real
-- background check, worker verification, availability, payment or dispatch readiness.
-- Before cleanup, stop the test child and confirm the GPS rows are physically absent.
do $fixtures$
declare
  ctx jsonb := nullif(current_setting('xoot.test_context',true),'')::jsonb;
  ca uuid := (ctx->>'customerA')::uuid; wa uuid := (ctx->>'workerA')::uuid;
  cb uuid := (ctx->>'customerB')::uuid; wb uuid := (ctx->>'workerB')::uuid;
  xa uuid := (ctx->>'xooterA')::uuid; xb uuid := (ctx->>'xooterB')::uuid;
  ba uuid := (ctx->>'bookingA')::uuid; bb uuid := (ctx->>'bookingB')::uuid;
  ja uuid := (ctx->>'jobA')::uuid; jb uuid := (ctx->>'jobB')::uuid;
  tag text := ctx->>'runTag';
  ea text; ewa text; eb text; ewb text;
begin
  if ctx is null or ctx->>'projectRef' is distinct from 'fxmxyabdjqviqbcxmvlp'
    or coalesce(ctx->>'action','') not in ('create','cleanup')
    or coalesce(tag,'') !~ '^xoot-private-journey-[0-9a-f-]{36}$'
    or array_position(array[ca,wa,cb,wb,xa,xb,ba,bb,ja,jb],null) is not null
    or (select count(distinct id) from unnest(array[ca,wa,cb,wb,xa,xb,ba,bb,ja,jb]) id) <> 10
    or to_regclass('public.xoot_job_live_positions') is null then
    raise exception 'Named staging target, four distinct verified identities and six fresh fixture IDs required';
  end if;
  select lower(email) into ea from auth.users where id=ca and email_confirmed_at is not null and not is_anonymous;
  select lower(email) into ewa from auth.users where id=wa and email_confirmed_at is not null and not is_anonymous;
  select lower(email) into eb from auth.users where id=cb and email_confirmed_at is not null and not is_anonymous;
  select lower(email) into ewb from auth.users where id=wb and email_confirmed_at is not null and not is_anonymous;
  if ea is null or ewa is null or eb is null or ewb is null
    or ea !~ '^[^+@]+\+xoot-customer(-a)?@gmail\.com$' or eb !~ '^[^+@]+\+xoot-customer(-b)?@gmail\.com$'
    or ewa !~ '^[^+@]+\+xoot-xooter(-a)?@gmail\.com$' or ewb !~ '^[^+@]+\+xoot-xooter(-b)?@gmail\.com$'
    or replace(ea,'+xoot-customer','+xoot-pair') <> replace(ewa,'+xoot-xooter','+xoot-pair')
    or replace(eb,'+xoot-customer','+xoot-pair') <> replace(ewb,'+xoot-xooter','+xoot-pair')
    or ea=eb then raise exception 'Four confirmed normal Auth aliases in the authorised A/B pairs required'; end if;
  if ctx->>'action'='create' then
    if exists(select 1 from public.xooters where id in(xa,xb) or user_id in(wa,wb))
      or exists(select 1 from public.bookings where id in(ba,bb))
      or exists(select 1 from public.xooter_jobs where id in(ja,jb) or booking_id in(ba,bb)) then
      raise exception 'Existing rows must never be overwritten by staging fixtures';
    end if;
    insert into public.xooters(id,user_id,name,role,rating,jobs_completed,hourly_rate,tags,active,
      verified,background_checked,background_check_status,years_experience,reliability_score,reliability_flagged)
    values(xa,wa,'Synthetic privacy fixture A — not a real worker','cleaning',0,0,0,array[tag,'synthetic-only'],true,false,false,'approved',0,0,true),
      (xb,wb,'Synthetic privacy fixture B — not a real worker','cleaning',0,0,0,array[tag,'synthetic-only'],true,false,false,'approved',0,0,true);
    insert into public.bookings(id,user_id,xooter_id,service,scheduled_at,duration_hours,address,status,price,notes,payment_status)
    values(ba,ca,xa,'cleaning',now()+interval '1 hour',2,'135 Rivonia Road, Sandton, Gauteng, South Africa','en_route',0,tag,'pending'),
      (bb,cb,xb,'cleaning',now()+interval '1 hour',2,'135 Rivonia Road, Sandton, Gauteng, South Africa','en_route',0,tag,'pending');
    insert into public.xooter_jobs(id,booking_id,xooter_id,state) values(ja,ba,xa,'accepted'),(jb,bb,xb,'accepted');
  else
    if exists(select 1 from public.xooters where id in(xa,xb) and not coalesce(tags @> array[tag,'synthetic-only'] and ((id=xa and user_id=wa) or(id=xb and user_id=wb)),false))
      or exists(select 1 from public.bookings where id in(ba,bb) and not coalesce(notes=tag and ((id=ba and user_id=ca and xooter_id=xa)or(id=bb and user_id=cb and xooter_id=xb)),false))
      or exists(select 1 from public.xooter_jobs where id in(ja,jb) and not coalesce((id=ja and booking_id=ba and xooter_id=xa)or(id=jb and booking_id=bb and xooter_id=xb),false))
      or exists(select 1 from public.bookings where (xooter_id in(xa,xb) or original_xooter_id in(xa,xb)) and id not in(ba,bb))
      or exists(select 1 from public.xooter_jobs where (xooter_id in(xa,xb) or booking_id in(ba,bb)) and id not in(ja,jb)) then
      raise exception 'Fixture ownership/marker or unexpected dependency mismatch; leave all rows untouched';
    end if;
    if exists(select 1 from public.xoot_job_live_positions where booking_id in(ba,bb)) then
      raise exception 'GPS cleanup not physically confirmed; stop the child and verify STOP/expiry before fixture deletion';
    end if;
    delete from public.xooter_jobs where id in(ja,jb);
    delete from public.bookings where id in(ba,bb);
    delete from public.xooters where id in(xa,xb);
  end if;
end;
$fixtures$;
