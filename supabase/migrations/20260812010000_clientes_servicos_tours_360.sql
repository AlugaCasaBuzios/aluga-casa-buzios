-- Clientes, contratos e cobrança dos passeios virtuais 360°.
-- Um cliente pode possuir vários passeios, mas cada passeio pertence a um único serviço.

create table if not exists public.virtual_tour_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_name text,
  whatsapp text,
  phone text,
  email text,
  document text,
  notes text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint virtual_tour_clients_name_not_blank
    check (char_length(btrim(name)) >= 2)
);

create table if not exists public.virtual_tour_services (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.virtual_tour_clients(id) on delete cascade,
  tour_id uuid not null references public.virtual_tours(id) on delete cascade,
  amount_cents integer not null default 0,
  due_date date,
  payment_status text not null default 'pending',
  paid_at timestamptz,
  service_status text not null default 'active',
  billing_cycle text not null default 'one_time',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint virtual_tour_services_tour_unique unique (tour_id),
  constraint virtual_tour_services_amount_nonnegative check (amount_cents >= 0),
  constraint virtual_tour_services_payment_status_check
    check (payment_status in ('pending', 'paid', 'overdue', 'waived')),
  constraint virtual_tour_services_service_status_check
    check (service_status in ('active', 'suspended', 'canceled')),
  constraint virtual_tour_services_billing_cycle_check
    check (billing_cycle in ('one_time', 'monthly', 'annual'))
);

create index if not exists virtual_tour_clients_name_idx
  on public.virtual_tour_clients (name);

create index if not exists virtual_tour_services_client_id_idx
  on public.virtual_tour_services (client_id);

create index if not exists virtual_tour_services_due_date_idx
  on public.virtual_tour_services (due_date);

create index if not exists virtual_tour_services_payment_status_idx
  on public.virtual_tour_services (payment_status);

create index if not exists virtual_tour_services_service_status_idx
  on public.virtual_tour_services (service_status);

alter table public.virtual_tour_clients enable row level security;
alter table public.virtual_tour_services enable row level security;

drop policy if exists "Management admins manage virtual tour clients"
  on public.virtual_tour_clients;

create policy "Management admins manage virtual tour clients"
  on public.virtual_tour_clients
  for all
  to authenticated
  using (public.is_management_admin())
  with check (public.is_management_admin());

drop policy if exists "Management admins manage virtual tour services"
  on public.virtual_tour_services;

create policy "Management admins manage virtual tour services"
  on public.virtual_tour_services
  for all
  to authenticated
  using (public.is_management_admin())
  with check (public.is_management_admin());

comment on table public.virtual_tour_clients is
  'Clientes comerciais que contrataram um ou mais passeios virtuais 360°.';

comment on table public.virtual_tour_services is
  'Vínculo comercial entre um cliente e um passeio, com cobrança e situação do serviço.';

comment on column public.virtual_tour_services.amount_cents is
  'Valor contratado em centavos de real.';

comment on column public.virtual_tour_services.service_status is
  'Situação operacional: active, suspended ou canceled.';

comment on column public.virtual_tour_services.payment_status is
  'Situação financeira: pending, paid, overdue ou waived.';
