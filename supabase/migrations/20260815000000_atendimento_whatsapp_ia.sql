-- Atendimento automatizado do WhatsApp com IA.
-- A automação nasce desativada e só pode ser habilitada pelo painel administrativo.

create table if not exists public.whatsapp_ai_settings (
  id smallint primary key default 1,
  ai_enabled boolean not null default false,
  auto_reply_enabled boolean not null default false,
  max_messages_per_10_minutes integer not null default 8,
  welcome_message text not null default
    'Olá! Sou a assistente virtual da Aluga Casa Búzios. Posso ajudar a encontrar casas, consultar datas e preparar uma estimativa. Um atendente humano pode assumir a conversa quando necessário.',
  handoff_message text not null default
    'Vou encaminhar sua conversa para nossa equipe. O atendimento humano continuará por este WhatsApp assim que possível.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_ai_settings_single_row check (id = 1),
  constraint whatsapp_ai_settings_rate_limit check (
    max_messages_per_10_minutes between 1 and 30
  )
);

create table if not exists public.ai_knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'geral',
  title text not null,
  content text not null,
  active boolean not null default true,
  priority integer not null default 100,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_knowledge_title_not_blank check (char_length(btrim(title)) >= 2),
  constraint ai_knowledge_content_not_blank check (char_length(btrim(content)) >= 2)
);

create table if not exists public.whatsapp_ai_contacts (
  id uuid primary key default gen_random_uuid(),
  wa_id text not null unique,
  display_name text,
  preferred_language text,
  opted_out boolean not null default false,
  first_message_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_ai_contacts_wa_id_not_blank check (char_length(btrim(wa_id)) >= 5)
);

create table if not exists public.whatsapp_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.whatsapp_ai_contacts(id) on delete cascade,
  meta_phone_number_id text not null,
  status text not null default 'open',
  ai_enabled boolean not null default true,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint whatsapp_ai_conversations_status_check check (
    status in ('open', 'human', 'closed')
  )
);

create table if not exists public.whatsapp_ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_ai_conversations(id) on delete cascade,
  meta_message_id text unique,
  direction text not null,
  sender_type text not null,
  message_type text not null default 'text',
  content text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  constraint whatsapp_ai_messages_direction_check check (
    direction in ('inbound', 'outbound')
  ),
  constraint whatsapp_ai_messages_sender_check check (
    sender_type in ('customer', 'ai', 'human', 'system')
  )
);

create table if not exists public.whatsapp_ai_handoffs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_ai_conversations(id) on delete cascade,
  status text not null default 'pending',
  reason text not null,
  assigned_to uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_ai_handoffs_status_check check (
    status in ('pending', 'accepted', 'resolved')
  )
);

create table if not exists public.whatsapp_ai_tool_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_ai_conversations(id) on delete cascade,
  tool_name text not null,
  arguments jsonb not null default '{}'::jsonb,
  result jsonb,
  success boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists whatsapp_ai_one_active_conversation_idx
  on public.whatsapp_ai_conversations (contact_id, meta_phone_number_id)
  where status in ('open', 'human');

create index if not exists whatsapp_ai_conversations_last_message_idx
  on public.whatsapp_ai_conversations (last_message_at desc);

create index if not exists whatsapp_ai_messages_conversation_created_idx
  on public.whatsapp_ai_messages (conversation_id, created_at desc);

create index if not exists whatsapp_ai_messages_inbound_rate_idx
  on public.whatsapp_ai_messages (conversation_id, created_at desc)
  where direction = 'inbound';

create index if not exists whatsapp_ai_handoffs_status_idx
  on public.whatsapp_ai_handoffs (status, requested_at desc);

create index if not exists ai_knowledge_active_priority_idx
  on public.ai_knowledge_entries (active, priority, title);

create unique index if not exists ai_knowledge_category_title_unique_idx
  on public.ai_knowledge_entries (category, title);

create or replace function public.set_whatsapp_ai_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists whatsapp_ai_settings_updated_at
  on public.whatsapp_ai_settings;
create trigger whatsapp_ai_settings_updated_at
before update on public.whatsapp_ai_settings
for each row execute function public.set_whatsapp_ai_updated_at();

drop trigger if exists ai_knowledge_entries_updated_at
  on public.ai_knowledge_entries;
create trigger ai_knowledge_entries_updated_at
before update on public.ai_knowledge_entries
for each row execute function public.set_whatsapp_ai_updated_at();

drop trigger if exists whatsapp_ai_contacts_updated_at
  on public.whatsapp_ai_contacts;
create trigger whatsapp_ai_contacts_updated_at
before update on public.whatsapp_ai_contacts
for each row execute function public.set_whatsapp_ai_updated_at();

drop trigger if exists whatsapp_ai_conversations_updated_at
  on public.whatsapp_ai_conversations;
create trigger whatsapp_ai_conversations_updated_at
before update on public.whatsapp_ai_conversations
for each row execute function public.set_whatsapp_ai_updated_at();

drop trigger if exists whatsapp_ai_handoffs_updated_at
  on public.whatsapp_ai_handoffs;
create trigger whatsapp_ai_handoffs_updated_at
before update on public.whatsapp_ai_handoffs
for each row execute function public.set_whatsapp_ai_updated_at();

alter table public.whatsapp_ai_settings enable row level security;
alter table public.ai_knowledge_entries enable row level security;
alter table public.whatsapp_ai_contacts enable row level security;
alter table public.whatsapp_ai_conversations enable row level security;
alter table public.whatsapp_ai_messages enable row level security;
alter table public.whatsapp_ai_handoffs enable row level security;
alter table public.whatsapp_ai_tool_events enable row level security;

drop policy if exists "Management admins manage WhatsApp AI settings"
  on public.whatsapp_ai_settings;
create policy "Management admins manage WhatsApp AI settings"
  on public.whatsapp_ai_settings for all to authenticated
  using (public.is_management_admin())
  with check (public.is_management_admin());

drop policy if exists "Management admins manage AI knowledge"
  on public.ai_knowledge_entries;
create policy "Management admins manage AI knowledge"
  on public.ai_knowledge_entries for all to authenticated
  using (public.is_management_admin())
  with check (public.is_management_admin());

drop policy if exists "Management admins manage WhatsApp AI contacts"
  on public.whatsapp_ai_contacts;
create policy "Management admins manage WhatsApp AI contacts"
  on public.whatsapp_ai_contacts for all to authenticated
  using (public.is_management_admin())
  with check (public.is_management_admin());

drop policy if exists "Management admins manage WhatsApp AI conversations"
  on public.whatsapp_ai_conversations;
create policy "Management admins manage WhatsApp AI conversations"
  on public.whatsapp_ai_conversations for all to authenticated
  using (public.is_management_admin())
  with check (public.is_management_admin());

drop policy if exists "Management admins manage WhatsApp AI messages"
  on public.whatsapp_ai_messages;
create policy "Management admins manage WhatsApp AI messages"
  on public.whatsapp_ai_messages for all to authenticated
  using (public.is_management_admin())
  with check (public.is_management_admin());

drop policy if exists "Management admins manage WhatsApp AI handoffs"
  on public.whatsapp_ai_handoffs;
create policy "Management admins manage WhatsApp AI handoffs"
  on public.whatsapp_ai_handoffs for all to authenticated
  using (public.is_management_admin())
  with check (public.is_management_admin());

drop policy if exists "Management admins manage WhatsApp AI tool events"
  on public.whatsapp_ai_tool_events;
create policy "Management admins manage WhatsApp AI tool events"
  on public.whatsapp_ai_tool_events for all to authenticated
  using (public.is_management_admin())
  with check (public.is_management_admin());

insert into public.whatsapp_ai_settings (id)
values (1)
on conflict (id) do nothing;

insert into public.ai_knowledge_entries
  (category, title, content, priority)
values
  (
    'atendimento',
    'Identificação da assistente',
    'Apresente-se claramente como assistente virtual da Aluga Casa Búzios. Informe que um atendente humano pode assumir a conversa quando solicitado ou necessário.',
    10
  ),
  (
    'reservas',
    'Confirmação de reserva',
    'A assistente pode pesquisar imóveis, consultar disponibilidade e preparar estimativas. Nunca deve afirmar que uma reserva está confirmada, receber pagamento ou prometer bloqueio de datas.',
    20
  ),
  (
    'preços',
    'Preços e descontos',
    'Valores devem vir exclusivamente da ferramenta de orçamento. Descontos, parcelamento e condições especiais dependem de confirmação humana.',
    30
  ),
  (
    'privacidade',
    'Endereço dos imóveis',
    'Não forneça o endereço completo de um imóvel antes da reserva confirmada. Use apenas o bairro, referências públicas e a distância da praia disponíveis no cadastro.',
    40
  ),
  (
    'check-in',
    'Horários',
    'Use os horários de check-in e check-out cadastrados em cada imóvel. Pedidos de entrada antecipada ou saída tardia precisam ser encaminhados para atendimento humano.',
    50
  ),
  (
    'hóspedes',
    'Capacidade',
    'Nunca recomende um imóvel para uma quantidade de hóspedes superior à capacidade cadastrada. Crianças e bebês devem ser informados na consulta.',
    60
  ),
  (
    'idiomas',
    'Idiomas do atendimento',
    'Responda no idioma utilizado pelo cliente. O atendimento pode ser feito em português, espanhol ou inglês.',
    70
  ),
  (
    'segurança',
    'Situações urgentes ou sensíveis',
    'Emergências, acidentes, conflitos, reclamações graves, dados bancários, documentos pessoais e questões jurídicas devem ser transferidos imediatamente para um atendente humano.',
    80
  )
on conflict (category, title) do nothing;

comment on table public.whatsapp_ai_settings is
  'Configuração única da automação de atendimento; desativada por padrão.';
comment on table public.ai_knowledge_entries is
  'Conhecimento editorial usado no prompt, separado dos dados dinâmicos dos imóveis.';
comment on table public.whatsapp_ai_messages is
  'Histórico mínimo das mensagens recebidas e enviadas pelo atendimento.';
