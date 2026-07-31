import { properties } from "@/app/data/properties";

import { getAirbnbBlockedPeriods } from "@/lib/availability/getAirbnbAvailability";
import { calculatePropertyStayPrice } from "@/lib/pricing/calculatePropertyStayPrice";

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

    /*
     * Guardamos os valores já validados em
     * constantes. Assim o TypeScript reconhece
     * que checkIn e checkOut são strings.
     */
    const propertyId = body.propertyId;
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
     * Consulta o calendário iCal do Airbnb.
     * Quando o imóvel não possui calendário,
     * a função retorna uma lista vazia.
     */
    const blockedPeriods =
      await getAirbnbBlockedPeriods(
        property.id
      );

    /*
     * Verifica se alguma diária selecionada
     * atravessa um período bloqueado.
     */
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

    /*
     * Calcula o preço somente depois de confirmar
     * que não existe conflito com o Airbnb.
     */
    const quote =
      calculatePropertyStayPrice({
        property,
        checkIn,
        checkOut,
        referenceDate,
      });

    return Response.json({
      success: true,

      property: {
        id: property.id,
        title: property.title,
        neighborhood:
          property.neighborhood,
        basePrice: property.price,
        cleaningFee:
          property.cleaningFee,
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