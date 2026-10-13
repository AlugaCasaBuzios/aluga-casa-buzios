import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

/**
 * Registra que os preços de um ou mais imóveis
 * foram conferidos com o Airbnb agora.
 *
 * Usado ao salvar preços, preços por data e
 * períodos exclusivos, e pelo botão "Conferi".
 * Falhas são registradas sem interromper a ação
 * principal, que já foi salva.
 */
export async function markPricingReviewed(
  propertyIds: string[],
  userId: string | null
): Promise<boolean> {
  const ids = Array.from(
    new Set(
      propertyIds
        .map((id) => id.trim())
        .filter(Boolean)
    )
  );

  if (ids.length === 0) {
    return true;
  }

  const supabase =
    createSupabaseAdminClient();

  const { error } = await supabase
    .from("property_pricing")
    .update({
      pricing_reviewed_at:
        new Date().toISOString(),
      pricing_reviewed_by: userId,
    })
    .in("property_id", ids);

  if (error) {
    console.error(
      "Erro ao registrar revisão de preços:",
      error
    );

    return false;
  }

  return true;
}
