-- Preços manuais por imóvel, lembrete de revisão e exportação iCal.
-- Todas as alterações são aditivas: o código atual em produção continua
-- funcionando antes e depois desta migration.

-- 1. Configurações de preço por imóvel ------------------------------

alter table public.property_pricing
  -- Desconto aplicado sobre o preço por noite cadastrado (o do Airbnb).
  add column if not exists site_discount_percent numeric(5,2) not null default 0
    check (site_discount_percent >= 0 and site_discount_percent <= 50),
  -- Ajustes automáticos (dia da semana, antecedência, última hora).
  add column if not exists dynamic_rules_enabled boolean not null default false,
  -- Última vez em que o administrador conferiu os preços com o Airbnb.
  add column if not exists pricing_reviewed_at timestamptz,
  add column if not exists pricing_reviewed_by uuid
    references auth.users(id) on delete set null;

-- 2. Períodos especiais por imóvel e com preço fixo -----------------

alter table public.special_pricing_rules
  -- Nulo: o período vale para todos os imóveis.
  add column if not exists property_id text
    references public.property_pricing(property_id) on delete cascade,
  -- Quando preenchido, substitui o multiplicador.
  add column if not exists nightly_price numeric(10,2)
    check (nightly_price is null or nightly_price > 0);

create index if not exists special_pricing_rules_property_idx
  on public.special_pricing_rules (property_id, start_date, end_date);

-- 3. Configurações gerais do painel ---------------------------------

create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.admin_settings enable row level security;

drop policy if exists "admins manage settings" on public.admin_settings;
create policy "admins manage settings"
  on public.admin_settings for all to authenticated
  using (public.is_management_admin())
  with check (public.is_management_admin());

drop trigger if exists admin_settings_set_updated_at on public.admin_settings;
create trigger admin_settings_set_updated_at
  before update on public.admin_settings
  for each row execute function public.set_updated_at();

-- 4. Registro dos lembretes enviados (um por semana) ----------------

create table if not exists public.price_review_reminder_log (
  id uuid primary key default gen_random_uuid(),
  week_key text not null unique,
  sent_at timestamptz not null default now(),
  recipients text[] not null default '{}',
  property_ids text[] not null default '{}'
);

alter table public.price_review_reminder_log enable row level security;

drop policy if exists "admins read reminder log" on public.price_review_reminder_log;
create policy "admins read reminder log"
  on public.price_review_reminder_log for select to authenticated
  using (public.is_management_admin());

-- 5. Links secretos de exportação iCal -------------------------------
-- Sem políticas: somente a chave secreta (servidor) lê e grava.

create table if not exists public.property_ical_exports (
  property_id text primary key
    references public.property_pricing(property_id) on delete cascade,
  token text not null unique
    default encode(extensions.gen_random_bytes(32), 'hex')
    check (token ~ '^[0-9a-f]{64}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  rotated_at timestamptz,
  last_fetched_at timestamptz
);

alter table public.property_ical_exports enable row level security;

revoke all on table public.admin_settings from anon;
revoke all on table public.price_review_reminder_log from anon;
revoke all on table public.property_ical_exports from anon, authenticated;

insert into public.property_ical_exports (property_id)
select property_id
from public.property_pricing
on conflict (property_id) do nothing;
