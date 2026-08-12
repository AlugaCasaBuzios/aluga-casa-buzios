-- Acesso público ou protegido dos passeios virtuais 360°.
-- A senha nunca é armazenada em texto; somente o hash criado no servidor.

alter table public.virtual_tours
  add column if not exists access_mode text not null default 'public',
  add column if not exists access_password_hash text,
  add column if not exists access_expires_at timestamptz,
  add column if not exists access_version uuid not null default gen_random_uuid();

update public.virtual_tours
set
  access_mode = coalesce(nullif(access_mode, ''), 'public'),
  access_version = coalesce(access_version, gen_random_uuid());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'virtual_tours_access_mode_check'
      and conrelid = 'public.virtual_tours'::regclass
  ) then
    alter table public.virtual_tours
      add constraint virtual_tours_access_mode_check
      check (access_mode in ('public', 'password'));
  end if;
end
$$;

create index if not exists virtual_tours_access_expires_at_idx
  on public.virtual_tours (access_expires_at)
  where access_expires_at is not null;

comment on column public.virtual_tours.access_mode is
  'Modo de acesso do passeio: public ou password.';

comment on column public.virtual_tours.access_password_hash is
  'Hash scrypt da senha; a senha original nunca é persistida.';

comment on column public.virtual_tours.access_expires_at is
  'Data e hora opcional em que o link deixa de abrir.';

comment on column public.virtual_tours.access_version is
  'Versão que invalida sessões anteriores ao alterar a configuração de acesso.';
