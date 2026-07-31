import { properties } from "@/app/data/properties";

import {
  getAirbnbBlockedPeriods,
} from "@/lib/availability/getAirbnbAvailability";

import {
  hasAirbnbCalendar,
} from "@/lib/availability/airbnbCalendars";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface AvailabilityRouteContext {
  params: Promise<{
    propertyId: string;
  }>;
}

export async function GET(
  _request: Request,
  context: AvailabilityRouteContext
): Promise<Response> {
  try {
    const { propertyId } = await context.params;

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

    const calendarConfigured =
      hasAirbnbCalendar(property.id);

    if (!calendarConfigured) {
      return Response.json({
        success: true,

        property: {
          id: property.id,
          title: property.title,
        },

        calendarConfigured: false,
        blockedPeriods: [],
      });
    }

    const blockedPeriods =
      await getAirbnbBlockedPeriods(
        property.id
      );

    return Response.json({
      success: true,

      property: {
        id: property.id,
        title: property.title,
      },

      calendarConfigured: true,
      blockedPeriods,
      lastCheckedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Erro ao consultar disponibilidade:",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          "Não foi possível consultar a disponibilidade neste momento.",
      },
      {
        status: 502,
      }
    );
  }
}