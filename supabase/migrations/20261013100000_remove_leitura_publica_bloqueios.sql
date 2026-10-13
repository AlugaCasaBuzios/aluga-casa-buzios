-- Bloqueios manuais e preços por data deixam de ser legíveis pela chave
-- pública (anon). Os campos reason e notes são internos e podem conter
-- dados de hóspedes. O site passa a ler essas tabelas somente no
-- servidor, com a chave secreta.
--
-- Aplicar SOMENTE depois que o código que usa createSupabaseAdminClient
-- em getManualAvailabilityBlocks e getDatePricingOverrides estiver em
-- produção; antes disso, o orçamento deixaria de ver os bloqueios.

drop policy if exists "Public can read active manual blocks"
  on public.manual_availability_blocks;

drop policy if exists "Public can read active date overrides"
  on public.date_pricing_overrides;

revoke all on table public.manual_availability_blocks from anon;
revoke all on table public.date_pricing_overrides from anon;
