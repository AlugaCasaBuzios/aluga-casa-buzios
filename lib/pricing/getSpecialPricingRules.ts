import {
  specialPricingRules as localSpecialPricingRules,
  type SpecialPricingRule,
} from "@/app/data/specialPricing";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

type SpecialPricingRuleRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  multiplier: number | string;
  nightly_price: number | string | null;
  property_id: string | null;
  minimum_nights: number;
  priority: number;
  label: string;
  active: boolean;
};

export type SpecialPricingRulesSource =
  | "supabase"
  | "local";

export interface SpecialPricingRulesResult {
  rules: SpecialPricingRule[];
  source: SpecialPricingRulesSource;
}

function getLocalRules(): SpecialPricingRulesResult {
  return {
    rules: localSpecialPricingRules,
    source: "local",
  };
}

function toOptionalPositiveNumber(
  value: number | string | null
): number | null {
  if (value === null) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) &&
    parsedValue > 0
    ? parsedValue
    : null;
}

/**
 * Carrega os períodos especiais ativos.
 *
 * Com propertyId, retorna os períodos gerais
 * (sem imóvel) e os exclusivos daquele imóvel.
 * As regras locais só são usadas se o Supabase
 * falhar; uma lista vazia é respeitada.
 */
export async function getSpecialPricingRules(
  propertyId?: string
): Promise<SpecialPricingRulesResult> {
  try {
    const supabase =
      await createSupabaseServerClient();

    let query = supabase
      .from("special_pricing_rules")
      .select(`
        id,
        name,
        start_date,
        end_date,
        multiplier,
        nightly_price,
        property_id,
        minimum_nights,
        priority,
        label,
        active
      `)
      .eq("active", true);

    if (propertyId) {
      query = query.or(
        `property_id.is.null,property_id.eq.${propertyId}`
      );
    } else {
      query = query.is(
        "property_id",
        null
      );
    }

    const { data, error } = await query
      .order("priority", {
        ascending: false,
      })
      .order("start_date", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Erro ao consultar períodos especiais:",
        error
      );

      return getLocalRules();
    }

    const rows =
      (data ?? []) as SpecialPricingRuleRow[];

    const rules: SpecialPricingRule[] =
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        startDate: row.start_date,
        endDate: row.end_date,
        multiplier: Number(row.multiplier),
        nightlyPrice:
          toOptionalPositiveNumber(
            row.nightly_price
          ),
        propertyId: row.property_id,
        minimumNights: Number(
          row.minimum_nights
        ),
        /*
         * Um período exclusivo do imóvel vence
         * um período geral de mesma prioridade.
         */
        priority:
          Number(row.priority) +
          (row.property_id ? 0.5 : 0),
        label: row.label,
      }));

    return {
      rules,
      source: "supabase",
    };
  } catch (error) {
    console.error(
      "Falha ao carregar períodos especiais:",
      error
    );

    return getLocalRules();
  }
}
