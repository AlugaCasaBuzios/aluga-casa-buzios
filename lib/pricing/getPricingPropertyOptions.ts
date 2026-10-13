import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export interface PricingPropertyOption {
  id: string;
  name: string;
}

/**
 * Lista os imóveis com configuração de preço,
 * para os seletores do painel.
 */
export async function getPricingPropertyOptions(): Promise<
  PricingPropertyOption[]
> {
  const supabase =
    createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("property_pricing")
    .select("property_id, property_name")
    .order("property_name", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Erro ao carregar imóveis para seleção:",
      error
    );

    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.property_id),
    name: String(row.property_name),
  }));
}
