import "server-only";

/**
 * Relaciona cada imóvel ao nome da variável
 * de ambiente que contém seu calendário iCal.
 *
 * Os links privados nunca ficam no código
 * enviado ao navegador.
 */
const calendarEnvironmentVariables: Record<
  string,
  string | undefined
> = {
  "arete-top":
    process.env.AIRBNB_ICAL_ARETE_TOP,
};

/**
 * Retorna o endereço iCal do imóvel.
 *
 * Quando o imóvel ainda não possui calendário
 * configurado, retorna null.
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
    const parsedUrl = new URL(calendarUrl);

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
 * Informa se o imóvel possui um calendário
 * Airbnb configurado.
 */
export function hasAirbnbCalendar(
  propertyId: string
): boolean {
  return getAirbnbCalendarUrl(propertyId) !== null;
}