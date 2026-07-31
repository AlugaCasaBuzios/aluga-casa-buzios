import "server-only";

/**
 * Relaciona cada imóvel à variável segura
 * que contém seu calendário iCal do Airbnb.
 *
 * Os links privados permanecem somente no
 * arquivo .env.local e nas variáveis da Vercel.
 */
const calendarEnvironmentVariables: Record<
  string,
  string | undefined
> = {
  "arete-top":
    process.env.AIRBNB_ICAL_ARETE_TOP,

  "casa-em-buzios":
    process.env.AIRBNB_ICAL_BUZIOS_TEMPORADA,

  "casa-da-margarida":
    process.env.AIRBNB_ICAL_CASA_DA_MARGARIDA,

  "casa-doce-mar":
    process.env.AIRBNB_ICAL_CASA_DOCE_MAR,

  "casa-toriba":
    process.env.AIRBNB_ICAL_CASA_TORIBA,
};

/**
 * Retorna o endereço iCal configurado
 * para determinado imóvel.
 *
 * Quando não existe calendário configurado,
 * retorna null.
 */
export function getAirbnbCalendarUrl(
  propertyId: string
): string | null {
  const calendarUrl =
    calendarEnvironmentVariables[propertyId];

  if (!calendarUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(
      calendarUrl.trim()
    );

    if (
      parsedUrl.protocol !== "https:" &&
      parsedUrl.protocol !== "http:"
    ) {
      return null;
    }

    if (
      !parsedUrl.pathname
        .toLowerCase()
        .endsWith(".ics")
    ) {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
}

/**
 * Informa se o imóvel possui
 * calendário Airbnb configurado.
 */
export function hasAirbnbCalendar(
  propertyId: string
): boolean {
  return (
    getAirbnbCalendarUrl(propertyId) !==
    null
  );
}