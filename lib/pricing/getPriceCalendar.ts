import "server-only";

import { getAirbnbBlockedPeriods } from "@/lib/availability/getAirbnbAvailability";
import { hasAirbnbCalendar } from "@/lib/availability/airbnbCalendars";
import { calculateDynamicPrice } from "@/lib/pricing/calculateDynamicPrice";
import { getDatePricingOverrides } from "@/lib/pricing/getDatePricingOverrides";
import { getPropertyPricingConfig } from "@/lib/pricing/getPropertyPricingConfig";
import { getSpecialPricingRules } from "@/lib/pricing/getSpecialPricingRules";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export type NightAvailability =
  | "livre"
  | "airbnb"
  | "manual";

export interface PriceCalendarNight {
  date: string;
  weekday: number;
  airbnbPrice: number;
  sitePrice: number;
  minimumNights: number;
  sourceLabel: string;
  availability: NightAvailability;
}

export interface PriceCalendar {
  nights: PriceCalendarNight[];
  siteDiscountPercent: number;
  dynamicRulesEnabled: boolean;
  warnings: string[];
}

function addDays(
  date: string,
  days: number
): string {
  const parsed = new Date(
    `${date}T00:00:00Z`
  );

  parsed.setUTCDate(
    parsed.getUTCDate() + days
  );

  return parsed.toISOString().slice(0, 10);
}

export function getTodayInBuzios(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isInside(
  date: string,
  periods: Array<{
    startDate: string;
    endDateExclusive: string;
  }>
): boolean {
  return periods.some(
    (period) =>
      date >= period.startDate &&
      date < period.endDateExclusive
  );
}

/**
 * Preço e disponibilidade de cada noite, para o
 * administrador comparar com o calendário do Airbnb.
 */
export async function getPriceCalendar(
  propertyId: string,
  startDate: string,
  days: number
): Promise<PriceCalendar | null> {
  const endDateExclusive = addDays(
    startDate,
    days
  );

  const supabase =
    createSupabaseAdminClient();

  const { data: pricingRow, error } =
    await supabase
      .from("property_pricing")
      .select(
        "property_id, base_price, cleaning_fee"
      )
      .eq("property_id", propertyId)
      .maybeSingle();

  if (error || !pricingRow) {
    return null;
  }

  const [
    config,
    special,
    overrides,
    manualBlocksResult,
  ] = await Promise.all([
    getPropertyPricingConfig({
      id: propertyId,
      price: Number(pricingRow.base_price),
      cleaningFee: Number(
        pricingRow.cleaning_fee ?? 0
      ),
    }),
    getSpecialPricingRules(propertyId),
    getDatePricingOverrides(
      propertyId,
      startDate,
      endDateExclusive
    ),
    supabase
      .from("manual_availability_blocks")
      .select(
        "start_date, end_date_exclusive"
      )
      .eq("property_id", propertyId)
      .eq("active", true)
      .lt("start_date", endDateExclusive)
      .gt("end_date_exclusive", startDate),
  ]);

  const warnings: string[] = [];

  let airbnbPeriods: Awaited<
    ReturnType<typeof getAirbnbBlockedPeriods>
  > = [];

  if (!hasAirbnbCalendar(propertyId)) {
    warnings.push(
      "Este imóvel não tem calendário do Airbnb configurado."
    );
  } else {
    try {
      airbnbPeriods =
        await getAirbnbBlockedPeriods(
          propertyId
        );
    } catch {
      warnings.push(
        "Não foi possível ler o calendário do Airbnb agora."
      );
    }
  }

  if (config.source !== "supabase") {
    warnings.push(
      "A configuração de preços não pôde ser lida do banco. Valores podem estar desatualizados."
    );
  }

  const manualPeriods = (
    manualBlocksResult.data ?? []
  ).map((row) => ({
    startDate: String(row.start_date),
    endDateExclusive: String(
      row.end_date_exclusive
    ),
  }));

  const nights: PriceCalendarNight[] = [];

  for (
    let index = 0;
    index < days;
    index += 1
  ) {
    const date = addDays(
      startDate,
      index
    );

    const result = calculateDynamicPrice({
      date,
      basePrice: config.basePrice,
      referenceDate: startDate,
      manualPrice:
        overrides.manualPrices[date],
      manualMinimumNights:
        overrides.manualMinimumNights[date],
      defaultMinimumNights:
        config.minimumNights,
      minimumPrice: config.minimumPrice,
      maximumPrice: config.maximumPrice,
      specialPricingRules: special.rules,
      dynamicRulesEnabled:
        config.dynamicRulesEnabled,
      siteDiscountPercent:
        config.siteDiscountPercent,
    });

    const sourceLabel = result.isManualPrice
      ? "Preço por data"
      : result.specialRule
        ? result.specialRule.name
        : "Preço-base";

    nights.push({
      date,
      weekday: new Date(
        `${date}T00:00:00Z`
      ).getUTCDay(),
      airbnbPrice:
        result.priceBeforeDiscount,
      sitePrice: result.finalPrice,
      minimumNights: result.minimumNights,
      sourceLabel,
      availability: isInside(
        date,
        manualPeriods
      )
        ? "manual"
        : isInside(date, airbnbPeriods)
          ? "airbnb"
          : "livre",
    });
  }

  return {
    nights,
    siteDiscountPercent:
      config.siteDiscountPercent,
    dynamicRulesEnabled:
      config.dynamicRulesEnabled,
    warnings,
  };
}
