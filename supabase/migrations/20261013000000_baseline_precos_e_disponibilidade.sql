-- Linha de base do schema de preços, catálogo e disponibilidade.
--
-- Estas tabelas foram criadas direto pelo SQL Editor e não estavam
-- versionadas. Este arquivo reproduz o estado do banco de produção em
-- 2026-10-13 (obtido do catálogo do Postgres) e é idempotente: em um
-- banco que já tem as tabelas, não altera nada.
--
-- NÃO aplicar em produção: serve para documentação e para recriar o
-- schema em um banco novo.

-- Funções auxiliares ------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_property_catalog_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create or replace function public.update_property_pricing_timestamp()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create or replace function public.update_special_pricing_timestamp()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create or replace function public.update_date_pricing_override_timestamp()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create or replace function public.update_manual_availability_block_timestamp()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- management_users ---------------------------------------------------

create table if not exists public.management_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role = any (array['admin', 'staff'])),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists management_users_role_idx
  on public.management_users (role, active);

create or replace function public.current_management_role()
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select mu.role
  from public.management_users mu
  where mu.user_id = auth.uid()
    and mu.active = true
  limit 1;
$$;

create or replace function public.is_management_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(public.current_management_role() = 'admin', false);
$$;

alter table public.management_users enable row level security;

drop policy if exists "admins manage management users" on public.management_users;
create policy "admins manage management users"
  on public.management_users for all to authenticated
  using (public.is_management_admin())
  with check (public.is_management_admin());

drop policy if exists "management users read own or admin" on public.management_users;
create policy "management users read own or admin"
  on public.management_users for select to authenticated
  using (user_id = auth.uid() or public.is_management_admin());

drop trigger if exists management_users_set_updated_at on public.management_users;
create trigger management_users_set_updated_at
  before update on public.management_users
  for each row execute function public.set_updated_at();

-- property_catalog ---------------------------------------------------

create table if not exists public.property_catalog (
  id text primary key check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  neighborhood text not null default '',
  address text,
  guests integer not null default 1 check (guests >= 1),
  bedrooms integer not null default 0 check (bedrooms >= 0),
  bathrooms numeric(4,1) not null default 0 check (bathrooms >= 0),
  beds integer not null default 0 check (beds >= 0),
  suites integer not null default 0 check (suites >= 0),
  area numeric(10,2) not null default 0 check (area >= 0),
  garage integer not null default 0 check (garage >= 0),
  pet_friendly boolean not null default false,
  pool boolean not null default false,
  barbecue boolean not null default false,
  wifi boolean not null default false,
  air_conditioning boolean not null default false,
  kitchen boolean not null default false,
  washing_machine boolean not null default false,
  beach_distance text not null default '',
  checkin time not null default '15:00:00',
  checkout time not null default '11:00:00',
  image text not null default '',
  gallery text[] not null default '{}',
  description text not null default '',
  amenities text[] not null default '{}',
  rules text[] not null default '{}',
  airbnb text not null default '',
  booking text,
  whatsapp text not null default '',
  rating numeric(3,2) not null default 0 check (rating >= 0 and rating <= 5),
  reviews integer not null default 0 check (reviews >= 0),
  latitude double precision check (latitude is null or (latitude >= -90 and latitude <= 90)),
  longitude double precision check (longitude is null or (longitude >= -180 and longitude <= 180)),
  keywords text[] not null default '{}',
  active boolean not null default true,
  featured boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_catalog_active_idx
  on public.property_catalog (active);
create index if not exists property_catalog_display_order_idx
  on public.property_catalog (active, display_order, title);
create index if not exists property_catalog_neighborhood_idx
  on public.property_catalog (neighborhood);

alter table public.property_catalog enable row level security;

drop policy if exists "Public can read active properties" on public.property_catalog;
create policy "Public can read active properties"
  on public.property_catalog for select to anon, authenticated
  using (active = true);

drop trigger if exists property_catalog_updated_at_trigger on public.property_catalog;
create trigger property_catalog_updated_at_trigger
  before update on public.property_catalog
  for each row execute function public.set_property_catalog_updated_at();

-- property_pricing ---------------------------------------------------
-- As políticas de administrador usam o UUID fixo do administrador
-- principal, exatamente como estão no banco.

create table if not exists public.property_pricing (
  property_id text primary key,
  property_name text not null,
  base_price numeric(10,2) not null check (base_price > 0),
  cleaning_fee numeric(10,2) check (cleaning_fee is null or cleaning_fee >= 0),
  minimum_nights integer check (minimum_nights is null or minimum_nights >= 1),
  minimum_price numeric(10,2) check (minimum_price is null or minimum_price > 0),
  maximum_price numeric(10,2) check (maximum_price is null or maximum_price > 0),
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint valid_property_price_range check (
    minimum_price is null or maximum_price is null or minimum_price <= maximum_price
  )
);

alter table public.property_pricing enable row level security;

drop policy if exists "Admin can read all pricing" on public.property_pricing;
create policy "Admin can read all pricing"
  on public.property_pricing for select to authenticated
  using (auth.uid() = '498c545b-b63f-4c1e-a6cf-c0edeab6fbaf'::uuid);

drop policy if exists "Admin can update pricing" on public.property_pricing;
create policy "Admin can update pricing"
  on public.property_pricing for update to authenticated
  using (auth.uid() = '498c545b-b63f-4c1e-a6cf-c0edeab6fbaf'::uuid)
  with check (auth.uid() = '498c545b-b63f-4c1e-a6cf-c0edeab6fbaf'::uuid);

drop policy if exists "Public can read active pricing" on public.property_pricing;
create policy "Public can read active pricing"
  on public.property_pricing for select to anon
  using (active = true);

drop trigger if exists property_pricing_updated_at on public.property_pricing;
create trigger property_pricing_updated_at
  before update on public.property_pricing
  for each row execute function public.update_property_pricing_timestamp();

-- special_pricing_rules ----------------------------------------------

create table if not exists public.special_pricing_rules (
  id text primary key,
  name text not null,
  start_date date not null,
  end_date date not null,
  multiplier numeric(6,2) not null check (multiplier > 0),
  minimum_nights integer not null check (minimum_nights >= 1),
  priority integer not null default 0,
  label text not null,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint valid_special_pricing_period check (start_date <= end_date)
);

alter table public.special_pricing_rules enable row level security;

drop policy if exists "Admin can read special pricing" on public.special_pricing_rules;
create policy "Admin can read special pricing"
  on public.special_pricing_rules for select to authenticated
  using (auth.uid() = '498c545b-b63f-4c1e-a6cf-c0edeab6fbaf'::uuid);

drop policy if exists "Admin can insert special pricing" on public.special_pricing_rules;
create policy "Admin can insert special pricing"
  on public.special_pricing_rules for insert to authenticated
  with check (auth.uid() = '498c545b-b63f-4c1e-a6cf-c0edeab6fbaf'::uuid);

drop policy if exists "Admin can update special pricing" on public.special_pricing_rules;
create policy "Admin can update special pricing"
  on public.special_pricing_rules for update to authenticated
  using (auth.uid() = '498c545b-b63f-4c1e-a6cf-c0edeab6fbaf'::uuid)
  with check (auth.uid() = '498c545b-b63f-4c1e-a6cf-c0edeab6fbaf'::uuid);

drop policy if exists "Admin can delete special pricing" on public.special_pricing_rules;
create policy "Admin can delete special pricing"
  on public.special_pricing_rules for delete to authenticated
  using (auth.uid() = '498c545b-b63f-4c1e-a6cf-c0edeab6fbaf'::uuid);

drop policy if exists "Public can read active special pricing" on public.special_pricing_rules;
create policy "Public can read active special pricing"
  on public.special_pricing_rules for select to anon
  using (active = true);

drop trigger if exists special_pricing_updated_at on public.special_pricing_rules;
create trigger special_pricing_updated_at
  before update on public.special_pricing_rules
  for each row execute function public.update_special_pricing_timestamp();

-- date_pricing_overrides ---------------------------------------------

create table if not exists public.date_pricing_overrides (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.property_pricing(property_id) on delete cascade,
  pricing_date date not null,
  manual_price numeric(10,2) check (manual_price is null or manual_price > 0),
  minimum_nights integer check (minimum_nights is null or minimum_nights >= 1),
  notes text,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint unique_property_pricing_date unique (property_id, pricing_date),
  constraint price_or_minimum_nights_required check (
    manual_price is not null or minimum_nights is not null
  )
);

alter table public.date_pricing_overrides enable row level security;

drop policy if exists "Admin can read date overrides" on public.date_pricing_overrides;
create policy "Admin can read date overrides"
  on public.date_pricing_overrides for select to authenticated
  using (auth.uid() = '498c545b-b63f-4c1e-a6cf-c0edeab6fbaf'::uuid);

drop policy if exists "Admin can insert date overrides" on public.date_pricing_overrides;
create policy "Admin can insert date overrides"
  on public.date_pricing_overrides for insert to authenticated
  with check (auth.uid() = '498c545b-b63f-4c1e-a6cf-c0edeab6fbaf'::uuid);

drop policy if exists "Admin can update date overrides" on public.date_pricing_overrides;
create policy "Admin can update date overrides"
  on public.date_pricing_overrides for update to authenticated
  using (auth.uid() = '498c545b-b63f-4c1e-a6cf-c0edeab6fbaf'::uuid)
  with check (auth.uid() = '498c545b-b63f-4c1e-a6cf-c0edeab6fbaf'::uuid);

drop policy if exists "Admin can delete date overrides" on public.date_pricing_overrides;
create policy "Admin can delete date overrides"
  on public.date_pricing_overrides for delete to authenticated
  using (auth.uid() = '498c545b-b63f-4c1e-a6cf-c0edeab6fbaf'::uuid);

-- A política pública abaixo existia em 2026-10-13 e é removida pela
-- migration 20261013100000_remove_leitura_publica_bloqueios.sql.
drop policy if exists "Public can read active date overrides" on public.date_pricing_overrides;
create policy "Public can read active date overrides"
  on public.date_pricing_overrides for select to anon
  using (active = true);

drop trigger if exists date_pricing_override_updated_at on public.date_pricing_overrides;
create trigger date_pricing_override_updated_at
  before update on public.date_pricing_overrides
  for each row execute function public.update_date_pricing_override_timestamp();

-- manual_availability_blocks -----------------------------------------

create table if not exists public.manual_availability_blocks (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.property_pricing(property_id) on delete cascade,
  start_date date not null,
  end_date_exclusive date not null,
  reason text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_manual_block_period check (start_date < end_date_exclusive)
);

create index if not exists manual_blocks_property_dates_index
  on public.manual_availability_blocks (property_id, start_date, end_date_exclusive);

alter table public.manual_availability_blocks enable row level security;

drop policy if exists "Admin can read manual blocks" on public.manual_availability_blocks;
create policy "Admin can read manual blocks"
  on public.manual_availability_blocks for select to authenticated
  using (auth.uid() = '498c545b-b63f-4c1e-a6cf-c0edeab6fbaf'::uuid);

drop policy if exists "Admin can insert manual blocks" on public.manual_availability_blocks;
create policy "Admin can insert manual blocks"
  on public.manual_availability_blocks for insert to authenticated
  with check (auth.uid() = '498c545b-b63f-4c1e-a6cf-c0edeab6fbaf'::uuid);

drop policy if exists "Admin can update manual blocks" on public.manual_availability_blocks;
create policy "Admin can update manual blocks"
  on public.manual_availability_blocks for update to authenticated
  using (auth.uid() = '498c545b-b63f-4c1e-a6cf-c0edeab6fbaf'::uuid)
  with check (auth.uid() = '498c545b-b63f-4c1e-a6cf-c0edeab6fbaf'::uuid);

drop policy if exists "Admin can delete manual blocks" on public.manual_availability_blocks;
create policy "Admin can delete manual blocks"
  on public.manual_availability_blocks for delete to authenticated
  using (auth.uid() = '498c545b-b63f-4c1e-a6cf-c0edeab6fbaf'::uuid);

-- Removida pela migration 20261013100000_remove_leitura_publica_bloqueios.sql.
drop policy if exists "Public can read active manual blocks" on public.manual_availability_blocks;
create policy "Public can read active manual blocks"
  on public.manual_availability_blocks for select to anon
  using (active = true);

drop trigger if exists manual_availability_block_updated_at on public.manual_availability_blocks;
create trigger manual_availability_block_updated_at
  before update on public.manual_availability_blocks
  for each row execute function public.update_manual_availability_block_timestamp();
