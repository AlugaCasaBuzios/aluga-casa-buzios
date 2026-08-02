import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

type DatePricingOverrideRow = {
  pricing_date: string;
  manual_price: number | string | null;
  minimum_nights: number | null;
};

export type DatePricingOverridesSource =
  | "supabase"
  | "empty";

export interface DatePricingOverridesResult {
  manualPrices: Record<string, number>;

  manualMinimumNights: Record<
    string,
    number
  >;

  source: DatePricingOverridesSource;
}

function getEmptyResult():
  DatePricingOverridesResult {
  return {
    manualPrices: {},
    manualMinimumNights: {},
    source: "empty",
  };
}

export async function getDatePricingOverrides(
  propertyId: string,
  checkIn: string,
  checkOut: string
): Promise<DatePricingOverridesResult> {
  try {
    const supabase =
      await createSupabaseServerClient();

    const {
      data,
      error,
    } = await supabase
      .from("date_pricing_overrides")
      .select(`
        pricing_date,
        manual_price,
        minimum_nights
      `)
      .eq("property_id", propertyId)
      .eq("active", true)
      .gte("pricing_date", checkIn)
      .lt("pricing_date", checkOut)
      .order("pricing_date", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Erro ao consultar preços manuais por data:",
        error
      );

      return getEmptyResult();
    }

    const rows =
      (data ?? []) as DatePricingOverrideRow[];

    const manualPrices: Record<
      string,
      number
    > = {};

    const manualMinimumNights: Record<
      string,
      number
    > = {};

    for (const row of rows) {
      if (row.manual_price !== null) {
        const manualPrice =
          Number(row.manual_price);

        if (
          Number.isFinite(manualPrice) &&
          manualPrice > 0
        ) {
          manualPrices[
            row.pricing_date
          ] = manualPrice;
        }
      }

      if (row.minimum_nights !== null) {
        const minimumNights =
          Number(row.minimum_nights);

        if (
          Number.isInteger(
            minimumNights
          ) &&
          minimumNights > 0
        ) {
          manualMinimumNights[
            row.pricing_date
          ] = minimumNights;
        }
      }
    }

    return {
      manualPrices,
      manualMinimumNights,
      source: "supabase",
    };
  } catch (error) {
    console.error(
      "Falha ao carregar preços manuais por data:",
      error
    );

    return getEmptyResult();
  }
}