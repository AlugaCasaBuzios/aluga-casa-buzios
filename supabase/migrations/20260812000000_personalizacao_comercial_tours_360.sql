-- Personalização comercial dos passeios virtuais 360°.
-- Este script é idempotente e pode ser executado novamente sem duplicar colunas.

alter table public.virtual_tours
  add column if not exists contact_phone text,
  add column if not exists logo_path text,
  add column if not exists primary_color text not null default '#172554',
  add column if not exists accent_color text not null default '#38BDF8',
  add column if not exists white_label boolean not null default false;

update public.virtual_tours
set
  primary_color = coalesce(nullif(primary_color, ''), '#172554'),
  accent_color = coalesce(nullif(accent_color, ''), '#38BDF8'),
  white_label = coalesce(white_label, false);

comment on column public.virtual_tours.contact_phone is
  'Telefone comercial exibido no passeio público.';

comment on column public.virtual_tours.logo_path is
  'Caminho do logotipo no bucket virtual-tour-images.';

comment on column public.virtual_tours.primary_color is
  'Cor principal hexadecimal da identidade visual do passeio.';

comment on column public.virtual_tours.accent_color is
  'Cor hexadecimal de destaque da identidade visual do passeio.';

comment on column public.virtual_tours.white_label is
  'Quando verdadeiro, oculta a marca da plataforma no passeio público.';
