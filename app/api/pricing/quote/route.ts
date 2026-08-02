import { properties } from "@/app/data/properties";

import {
  getAirbnbBlockedPeriods,
} from "@/lib/availability/getAirbnbAvailability";

import {
  calculatePropertyStayPrice,
} from "@/lib/pricing/calculatePropertyStayPrice";

import {
  getDatePricingOverrides,
} from "@/lib/pricing/getDatePricingOverrides";

import {
  getPropertyPricingConfig,
} from "@/lib/pricing/getPropertyPricingConfig";

import {
  getSpecialPricingRules,
} from "@/lib/pricing/getSpecialPricingRules";

interface QuoteRequestBody {
  propertyId?: unknown;
  checkIn?: unknown;
  checkOut?: unknown;
  referenceDate?: unknown;
}

function isDateOnly(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  );
}

function periodsOverlap(
  checkIn: string,
  checkOut: string,
  blockedStart: string,
  blockedEndExclusive: string
): boolean {
  return (
    checkIn < blockedEndExclusive &&
    checkOut > blockedStart
  );
}

export async function POST(
  request: Request
): Promise<Response> {
  try {
    const body =
      (await request.json()) as QuoteRequestBody;

    if (
      typeof body.propertyId !== "string" ||
      body.propertyId.trim() === ""
    ) {
      return Response.json(
        {
          success: false,
          error: "Informe o imóvel.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isDateOnly(body.checkIn)) {
      return Response.json(
        {
          success: false,
          error:
            "Informe o check-in no formato YYYY-MM-DD.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isDateOnly(body.checkOut)) {
      return Response.json(
        {
          success: false,
          error:
            "Informe o check-out no formato YYYY-MM-DD.",
        },
        {
          status: 400,
        }
      );
    }

    if (body.checkOut <= body.checkIn) {
      return Response.json(
        {
          success: false,
          error:
            "O check-out precisa ser posterior ao check-in.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      body.referenceDate !== undefined &&
      !isDateOnly(body.referenceDate)
    ) {
      return Response.json(
        {
          success: false,
          error:
            "A data de referência precisa usar o formato YYYY-MM-DD.",
        },
        {
          status: 400,
        }
      );
    }

    const propertyId =
      body.propertyId.trim();

    const checkIn = body.checkIn;
    const checkOut = body.checkOut;

    const referenceDate =
      typeof body.referenceDate === "string"
        ? body.referenceDate
        : undefined;

    const property = properties.find(
      (item) => item.id === propertyId
    );

    if (!property) {
      return Response.json(
        {
          success: false,
          error: "Imóvel não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Busca os preços e regras gerais
     * do imóvel no Supabase.
     */
    const pricingConfig =
      await getPropertyPricingConfig(
        property
      );

    /*
     * Busca os períodos especiais ativos.
     */
    const specialPricingConfig =
      await getSpecialPricingRules();

    /*
     * Busca preços manuais e mínimos de noites
     * cadastrados para datas específicas.
     */
    const dateOverrides =
      await getDatePricingOverrides(
        property.id,
        checkIn,
        checkOut
      );

    /*
     * Consulta o calendário do Airbnb.
     */
    const blockedPeriods =
      await getAirbnbBlockedPeriods(
        property.id
      );

    const conflictingPeriod =
      blockedPeriods.find((period) =>
        periodsOverlap(
          checkIn,
          checkOut,
          period.startDate,
          period.endDateExclusive
        )
      );

    if (conflictingPeriod) {
      return Response.json(
        {
          success: false,

          error:
            "O imóvel não está disponível durante todo o período selecionado. Escolha outras datas.",

          unavailablePeriod: {
            startDate:
              conflictingPeriod.startDate,

            endDateExclusive:
              conflictingPeriod.endDateExclusive,
          },
        },
        {
          status: 409,
        }
      );
    }

    const quote =
      calculatePropertyStayPrice({
        property: {
          price:
            pricingConfig.basePrice,

          cleaningFee:
            pricingConfig.cleaningFee,
        },

        checkIn,
        checkOut,
        referenceDate,

        defaultMinimumNights:
          pricingConfig.minimumNights,

        minimumPrice:
          pricingConfig.minimumPrice,

        maximumPrice:
          pricingConfig.maximumPrice,

        specialPricingRules:
          specialPricingConfig.rules,

        manualPrices:
          dateOverrides.manualPrices,

        manualMinimumNights:
          dateOverrides.manualMinimumNights,
      });

    return Response.json({
      success: true,

      property: {
        id: property.id,
        title: property.title,

        neighborhood:
          property.neighborhood,

        basePrice:
          pricingConfig.basePrice,

        cleaningFee:
          pricingConfig.cleaningFee,

        minimumNights:
          pricingConfig.minimumNights ??
          null,

        minimumPrice:
          pricingConfig.minimumPrice ??
          null,

        maximumPrice:
          pricingConfig.maximumPrice ??
          null,
      },

      pricingSource:
        pricingConfig.source,

      specialPricingSource:
        specialPricingConfig.source,

      dateOverridesSource:
        dateOverrides.source,

      appliedDateOverrides: {
        manualPrices:
          dateOverrides.manualPrices,

        manualMinimumNights:
          dateOverrides.manualMinimumNights,
      },

      availabilityConfirmed: true,

      quote,
    });
  } catch (error) {
    console.error(
      "Erro ao calcular orçamento:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível calcular o orçamento.";

    return Response.json(
      {
        success: false,
        error: message,
      },
      {
        status: 400,
      }
    );
  }
}