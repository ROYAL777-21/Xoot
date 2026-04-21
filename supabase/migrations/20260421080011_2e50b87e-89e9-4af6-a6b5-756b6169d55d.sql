-- ============ ENUMS ============
create type public.app_role as enum ('admin', 'user', 'zooter');
create type public.service_category as enum ('cleaning','gardening','childcare','handyman','babysitting','petcare','maintenance');
create type public.booking_status as enum ('pending','confirmed','enroute','in_progress','completed','cancelled','reassigned');
create type public.subscription_status as enum ('active','paused','cancelled');

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  address text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "view own profile" on public.profiles for select using (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- ============ USER ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "view own roles" on public.user_roles for select using (auth.uid() = user_id);
create policy "admins manage roles" on public.user_roles for all using (public.has_role(auth.uid(),'admin'));

-- ============ ZOOTERS ============
create table public.zooters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role service_category not null,
  bio text,
  rating numeric(3,2) not null default 5.00,
  jobs_completed int not null default 0,
  hourly_rate numeric(10,2) not null,
  photo_url text,
  tags text[] not null default '{}',
  distance_mi numeric(4,1) not null default 1.0,
  is_zotm boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.zooters enable row level security;
create policy "anyone views zooters" on public.zooters for select using (true);
create policy "admins manage zooters" on public.zooters for all using (public.has_role(auth.uid(),'admin'));

-- ============ BOOKINGS ============
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  zooter_id uuid references public.zooters on delete set null,
  original_zooter_id uuid references public.zooters on delete set null,
  service service_category not null,
  scheduled_at timestamptz not null,
  duration_hours numeric(3,1) not null default 2.0,
  address text,
  status booking_status not null default 'pending',
  price numeric(10,2) not null,
  notes text,
  was_reassigned boolean not null default false,
  reassignment_acknowledged boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.bookings enable row level security;
create policy "view own bookings" on public.bookings for select using (auth.uid() = user_id);
create policy "create own bookings" on public.bookings for insert with check (auth.uid() = user_id);
create policy "update own bookings" on public.bookings for update using (auth.uid() = user_id);
create policy "delete own bookings" on public.bookings for delete using (auth.uid() = user_id);

-- ============ FAVORITES ============
create table public.favorites (
  user_id uuid not null references auth.users on delete cascade,
  zooter_id uuid not null references public.zooters on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, zooter_id)
);
alter table public.favorites enable row level security;
create policy "view own favorites" on public.favorites for select using (auth.uid() = user_id);
create policy "manage own favorites" on public.favorites for all using (auth.uid() = user_id);

-- ============ LOYALTY ============
create table public.loyalty_points (
  user_id uuid primary key references auth.users on delete cascade,
  points int not null default 0,
  free_credits int not null default 0,
  total_bookings int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.loyalty_points enable row level security;
create policy "view own loyalty" on public.loyalty_points for select using (auth.uid() = user_id);
create policy "update own loyalty" on public.loyalty_points for update using (auth.uid() = user_id);

-- ============ SUBSCRIPTIONS ============
create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cadence text not null,
  hours_per_visit numeric(3,1) not null,
  monthly_price numeric(10,2) not null,
  savings_pct int not null default 0,
  perks text[] not null default '{}',
  popular boolean not null default false
);
alter table public.subscription_plans enable row level security;
create policy "anyone views plans" on public.subscription_plans for select using (true);

create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  plan_id uuid not null references public.subscription_plans,
  status subscription_status not null default 'active',
  started_at timestamptz not null default now(),
  next_billing_at timestamptz not null default now() + interval '30 days'
);
alter table public.user_subscriptions enable row level security;
create policy "view own subs" on public.user_subscriptions for select using (auth.uid() = user_id);
create policy "manage own subs" on public.user_subscriptions for all using (auth.uid() = user_id);

-- ============ MESSAGES ============
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings on delete cascade,
  sender_type text not null check (sender_type in ('user','zooter')),
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "view messages on own booking" on public.messages for select
  using (exists (select 1 from public.bookings b where b.id = messages.booking_id and b.user_id = auth.uid()));
create policy "send messages on own booking" on public.messages for insert
  with check (exists (select 1 from public.bookings b where b.id = messages.booking_id and b.user_id = auth.uid()));

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.bookings;

-- ============ REASSIGNMENT STATE ============
create table public.user_reassignment_state (
  user_id uuid primary key references auth.users on delete cascade,
  successful_bookings_since_last int not null default 0,
  total_reassignments int not null default 0,
  show_modal boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.user_reassignment_state enable row level security;
create policy "view own reassign state" on public.user_reassignment_state for select using (auth.uid() = user_id);
create policy "update own reassign state" on public.user_reassignment_state for update using (auth.uid() = user_id);

-- ============ TRAINING ============
create table public.training_modules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  duration_min int not null,
  category text not null,
  badge_color text not null default 'sage'
);
alter table public.training_modules enable row level security;
create policy "anyone views modules" on public.training_modules for select using (true);

create table public.zooter_training_progress (
  id uuid primary key default gen_random_uuid(),
  zooter_id uuid not null references public.zooters on delete cascade,
  module_id uuid not null references public.training_modules on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (zooter_id, module_id)
);
alter table public.zooter_training_progress enable row level security;
create policy "anyone views progress" on public.zooter_training_progress for select using (true);

-- ============ SUPPORT ============
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  subject text not null,
  body text not null,
  ai_response text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
alter table public.support_tickets enable row level security;
create policy "view own tickets" on public.support_tickets for select using (auth.uid() = user_id);
create policy "create own tickets" on public.support_tickets for insert with check (auth.uid() = user_id);

-- ============ TIMESTAMPS TRIGGER ============
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger bookings_touch before update on public.bookings for each row execute function public.touch_updated_at();
create trigger loyalty_touch before update on public.loyalty_points for each row execute function public.touch_updated_at();
create trigger reassign_touch before update on public.user_reassignment_state for each row execute function public.touch_updated_at();

-- ============ NEW USER TRIGGER ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  insert into public.loyalty_points (user_id) values (new.id);
  insert into public.user_reassignment_state (user_id) values (new.id);
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ SEED ZOOTERS ============
insert into public.zooters (name, role, bio, rating, jobs_completed, hourly_rate, photo_url, tags, distance_mi, is_zotm) values
('Maria S.','cleaning','Detail-obsessed deep cleaner.',4.95,312,28,'/src/assets/worker-1.jpg','{Eco-friendly,Pet-safe}',0.8,true),
('Diego R.','gardening','Landscape designer turned weekly maintainer.',4.98,248,32,'/src/assets/worker-2.jpg','{Landscaping,Pruning}',1.2,false),
('Aisha K.','childcare','CPR-certified, bilingual ES/EN.',4.92,186,22,'/src/assets/worker-3.jpg','{"CPR certified",Bilingual}',0.5,false),
('Tom W.','handyman','Licensed plumber and electrician.',4.89,421,45,'/src/assets/worker-4.jpg','{Plumbing,Electric}',1.7,false),
('Priya N.','cleaning','Move-in/out specialist.',4.91,198,30,'/src/assets/worker-1.jpg','{"Move-out",Sanitizing}',2.1,false),
('Luca M.','gardening','Drought-tolerant garden specialist.',4.87,156,34,'/src/assets/worker-2.jpg','{Xeriscape,Irrigation}',1.5,false),
('Nadia B.','babysitting','Early childhood educator, evenings.',4.96,142,25,'/src/assets/worker-3.jpg','{"Early ed","Evening"}',0.9,false),
('Jamal T.','petcare','Walks, feeding, overnight stays.',4.94,267,20,'/src/assets/worker-4.jpg','{"Dog walking",Overnight}',1.1,false),
('Sofia G.','maintenance','HVAC + appliance repair.',4.88,189,48,'/src/assets/worker-4.jpg','{HVAC,Appliances}',2.3,false),
('Ivan P.','cleaning','Office and post-construction cleaning.',4.85,134,29,'/src/assets/worker-1.jpg','{Office,"Post-construction"}',1.8,false),
('Yuki H.','childcare','After-school pickup + tutoring.',4.93,178,26,'/src/assets/worker-3.jpg','{Tutoring,"School pickup"}',0.7,false),
('Eli K.','handyman','Furniture assembly + mounting.',4.86,302,35,'/src/assets/worker-4.jpg','{Assembly,Mounting}',1.4,false);

-- ============ SEED PLANS ============
insert into public.subscription_plans (name, cadence, hours_per_visit, monthly_price, savings_pct, perks, popular) values
('Weekly Refresh','weekly',2.0,199,15,'{"Same Zooter every visit","Priority booking","Free reschedules"}',false),
('Bi-weekly Balance','biweekly',3.0,179,20,'{"Same Zooter every visit","Priority booking","Free reschedules","2x loyalty points"}',true),
('Monthly Deep','monthly',4.0,119,10,'{"Same Zooter every visit","Free reschedules"}',false);

-- ============ SEED TRAINING MODULES ============
insert into public.training_modules (title, description, duration_min, category, badge_color) values
('Cleanliness Standards 101','ISSA-aligned cleaning standards and chemical safety.',45,'cleaning','sage'),
('Hospitality & Communication','Greet, listen, confirm — the Zoot service script.',30,'soft-skills','terracotta'),
('Eco-Friendly Practices','Green products, water-saving, waste sorting.',25,'sustainability','sage'),
('Child Safety Essentials','CPR refresher, allergens, emergency contacts.',60,'safety','terracotta'),
('Garden Pruning Mastery','Seasonal pruning across 12 common plant types.',50,'gardening','sage');