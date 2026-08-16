import "server-only";

import { getAirbnbBlockedPeriods } from "@/lib/availability/getAirbnbAvailability";
import { hasAirbnbCalendar } from "@/lib/availability/airbnbCalendars";
import { getManualAvailabilityBlocks } from "@/lib/availability/getManualAvailabilityBlocks";
import { calculatePropertyStayPrice } from "@/lib/pricing/calculatePropertyStayPrice";
import { getDatePricingOverrides } from "@/lib/pricing/getDatePricingOverrides";
import { getPropertyPricingConfig } from "@/lib/pricing/getPropertyPricingConfig";
import { getSpecialPricingRules } from "@/lib/pricing/getSpecialPricingRules";
import { getActivePropertyById } from "@/lib/propertyCatalog";

export interface PropertyQuoteInput {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  referenceDate?: string;
}

export interface PropertyQuoteResponse {
  status: number;
  body: Record<string, unknown>;
}

export function isDateOnly(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function periodsOverlap(
  checkIn: string,
  checkOut: string,
  blockedStart: string,
  blockedEndExclusive: string
): boolean {
  return checkIn < blockedEndExclusive && checkOut > blockedStart;
}

function failure(
  status: number,
  error: string,
  extra: Record<string, unknown> = {}
): PropertyQuoteResponse {
  return {
    status,
    body: { success: false, error, ...extra },
  };
}

export async function getPropertyQuote(
  input: PropertyQuoteInput
): Promise<PropertyQuoteResponse> {
  const propertyId = input.propertyId.trim();

  if (!propertyId) {
    return failure(400, "Informe o imóvel.");
  }

  if (!isDateOnly(input.checkIn)) {
    return failure(400, "Informe o check-in no formato YYYY-MM-DD.");
  }

  if (!isDateOnly(input.checkOut)) {
    return failure(400, "Informe o check-out no formato YYYY-MM-DD.");
  }

  if (input.checkOut <= input.checkIn) {
    return failure(400, "O check-out precisa ser posterior ao check-in.");
  }

  if (
    input.referenceDate !== undefined &&
    !isDateOnly(input.referenceDate)
  ) {
    return failure(
      400,
      "A data de referência precisa usar o formato YYYY-MM-DD."
    );
  }

  try {
    const property = await getActivePropertyById(propertyId);

    if (!property) {
      return failure(404, "Imóvel não encontrado.");
    }

    const [
      pricingConfig,
      specialPricingConfig,
      dateOverrides,
      manualBlocks,
    ] = await Promise.all([
      getPropertyPricingConfig(property),
      getSpecialPricingRules(),
      getDatePricingOverrides(property.id, input.checkIn, input.checkOut),
      getManualAvailabilityBlocks(property.id, input.checkIn, input.checkOut),
    ]);

    const manualConflict = manualBlocks.periods.find((period) =>
      periodsOverlap(
        input.checkIn,
        input.checkOut,
        period.startDate,
        period.endDateExclusive
      )
    );

    if (manualConflict) {
      return failure(
        409,
        "O imóvel está bloqueado durante parte do período selecionado. Escolha outras datas.",
        {
          conflictSource: "manual",
          unavailablePeriod: {
            startDate: manualConflict.startDate,
            endDateExclusive: manualConflict.endDateExclusive,
            reason: manualConflict.reason,
          },
        }
      );
    }

    const availabilityWarnings: string[] = [];
    const calendarConfigured = hasAirbnbCalendar(property.id);
    let airbnbCalendarVerified = false;
    let airbnbBlockedPeriods: Awaited<
      ReturnType<typeof getAirbnbBlockedPeriods>
    > = [];

    if (calendarConfigured) {
      try {
        airbnbBlockedPeriods = await getAirbnbBlockedPeriods(property.id);
        airbnbCalendarVerified = true;
      } catch (error) {
        console.error(
          `Falha ao verificar o calendário do imóvel ${property.id}:`,
          error
        );
        availabilityWarnings.push(
          "O calendário externo não pôde ser verificado. Confirme as datas com um atendente."
        );
      }
    } else {
      availabilityWarnings.push(
        "Este imóvel não possui calendário externo configurado. Confirme as datas com um atendente."
      );
    }

    if (manualBlocks.source !== "supabase") {
      availabilityWarnings.push(
        "Os bloqueios manuais não puderam ser confirmados."
      );
    }

    const airbnbConflict = airbnbBlockedPeriods.find((period) =>
      periodsOverlap(
        input.checkIn,
        input.checkOut,
        period.startDate,
        period.endDateExclusive
      )
    );

    if (airbnbConflict) {
      return failure(
        409,
        "O imóvel não está disponível durante todo o período selecionado. Escolha outras datas.",
        {
          conflictSource: "airbnb",
          unavailablePeriod: {
            startDate: airbnbConflict.startDate,
            endDateExclusive: airbnbConflict.endDateExclusive,
          },
        }
      );
    }

    const quote = calculatePropertyStayPrice({
      property: {
        price: pricingConfig.basePrice,
        cleaningFee: pricingConfig.cleaningFee,
      },
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      referenceDate: input.referenceDate,
      defaultMinimumNights: pricingConfig.minimumNights,
      minimumPrice: pricingConfig.minimumPrice,
      maximumPrice: pricingConfig.maximumPrice,
      specialPricingRules: specialPricingConfig.rules,
      manualPrices: dateOverrides.manualPrices,
      manualMinimumNights: dateOverrides.manualMinimumNights,
    });

    const availabilityConfirmed =
      manualBlocks.source === "supabase" && airbnbCalendarVerified;

    return {
      status: 200,
      body: {
        success: true,
        property: {
          id: property.id,
          title: property.title,
          neighborhood: property.neighborhood,
          basePrice: pricingConfig.basePrice,
          cleaningFee: pricingConfig.cleaningFee,
          minimumNights: pricingConfig.minimumNights ?? null,
          minimumPrice: pricingConfig.minimumPrice ?? null,
          maximumPrice: pricingConfig.maximumPrice ?? null,
        },
        pricingSource: pricingConfig.source,
        specialPricingSource: specialPricingConfig.source,
        dateOverridesSource: dateOverrides.source,
        manualAvailabilitySource: manualBlocks.source,
        appliedDateOverrides: {
          manualPrices: dateOverrides.manualPrices,
          manualMinimumNights: dateOverrides.manualMinimumNights,
        },
        availabilityConfirmed,
        availabilityWarnings,
        quote,
      },
    };
  } catch (error) {
    console.error("Erro ao calcular orçamento:", error);
    return failure(
      400,
      error instanceof Error
        ? error.message
        : "Não foi possível calcular o orçamento."
    );
  }
}
