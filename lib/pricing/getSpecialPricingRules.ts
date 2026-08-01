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

export async function getSpecialPricingRules():
  Promise<SpecialPricingRulesResult> {
  try {
    const supabase =
      await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("special_pricing_rules")
      .select(`
        id,
        name,
        start_date,
        end_date,
        multiplier,
        minimum_nights,
        priority,
        label,
        active
      `)
      .eq("active", true)
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

    if (rows.length === 0) {
      console.warn(
        "Nenhum período especial ativo no Supabase. Usando regras locais."
      );

      return getLocalRules();
    }

    const rules: SpecialPricingRule[] =
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        startDate: row.start_date,
        endDate: row.end_date,
        multiplier: Number(row.multiplier),
        minimumNights: Number(
          row.minimum_nights
        ),
        priority: Number(row.priority),
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