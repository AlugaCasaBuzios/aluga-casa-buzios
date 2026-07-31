import "server-only";

import {
  getAirbnbCalendarUrl,
} from "@/lib/availability/airbnbCalendars";

export interface AirbnbBlockedPeriod {
  /**
   * Primeiro dia indisponível.
   * Formato: YYYY-MM-DD
   */
  startDate: string;

  /**
   * Data final exclusiva.
   *
   * Exemplo:
   * startDate: 2026-08-10
   * endDateExclusive: 2026-08-13
   *
   * Bloqueia as noites dos dias 10, 11 e 12.
   */
  endDateExclusive: string;
}

function unfoldIcalLines(
  content: string
): string[] {
  const normalizedContent = content.replace(
    /\r\n/g,
    "\n"
  );

  const originalLines =
    normalizedContent.split("\n");

  const unfoldedLines: string[] = [];

  for (const line of originalLines) {
    if (
      (line.startsWith(" ") ||
        line.startsWith("\t")) &&
      unfoldedLines.length > 0
    ) {
      unfoldedLines[
        unfoldedLines.length - 1
      ] += line.slice(1);

      continue;
    }

    unfoldedLines.push(line.trim());
  }

  return unfoldedLines;
}

function convertIcalDate(
  value: string
): string | null {
  /**
   * Calendários iCal normalmente usam:
   * 20260810
   *
   * Alguns podem apresentar:
   * 20260810T120000Z
   *
   * Para disponibilidade, usamos somente
   * os oito primeiros dígitos.
   */
  const match = value.match(
    /^(\d{4})(\d{2})(\d{2})/
  );

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;

  const formattedDate =
    `${year}-${month}-${day}`;

  const parsedDate = new Date(
    `${formattedDate}T00:00:00Z`
  );

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate
      .toISOString()
      .slice(0, 10) !== formattedDate
  ) {
    return null;
  }

  return formattedDate;
}

function readDateFromEvent(
  eventLines: string[],
  fieldName: "DTSTART" | "DTEND"
): string | null {
  const line = eventLines.find(
    (eventLine) =>
      eventLine.startsWith(
        `${fieldName}:`
      ) ||
      eventLine.startsWith(
        `${fieldName};`
      )
  );

  if (!line) {
    return null;
  }

  const separatorIndex =
    line.indexOf(":");

  if (separatorIndex === -1) {
    return null;
  }

  const rawValue = line
    .slice(separatorIndex + 1)
    .trim();

  return convertIcalDate(rawValue);
}

function parseBlockedPeriods(
  icalContent: string
): AirbnbBlockedPeriod[] {
  const lines =
    unfoldIcalLines(icalContent);

  const periods: AirbnbBlockedPeriod[] =
    [];

  let currentEventLines:
    | string[]
    | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      currentEventLines = [];
      continue;
    }

    if (line === "END:VEVENT") {
      if (!currentEventLines) {
        continue;
      }

      const startDate =
        readDateFromEvent(
          currentEventLines,
          "DTSTART"
        );

      const endDateExclusive =
        readDateFromEvent(
          currentEventLines,
          "DTEND"
        );

      if (
        startDate &&
        endDateExclusive &&
        endDateExclusive > startDate
      ) {
        periods.push({
          startDate,
          endDateExclusive,
        });
      }

      currentEventLines = null;
      continue;
    }

    if (currentEventLines) {
      currentEventLines.push(line);
    }
  }

  /**
   * Remove períodos repetidos e ordena
   * pela data inicial.
   */
  const uniquePeriods = Array.from(
    new Map(
      periods.map((period) => [
        `${period.startDate}-${period.endDateExclusive}`,
        period,
      ])
    ).values()
  );

  return uniquePeriods.sort(
    (firstPeriod, secondPeriod) =>
      firstPeriod.startDate.localeCompare(
        secondPeriod.startDate
      )
  );
}

export async function getAirbnbBlockedPeriods(
  propertyId: string
): Promise<AirbnbBlockedPeriod[]> {
  const calendarUrl =
    getAirbnbCalendarUrl(propertyId);

  if (!calendarUrl) {
    return [];
  }

  const response = await fetch(
    calendarUrl,
    {
      next: {
        /**
         * Atualiza o calendário a cada hora.
         */
        revalidate: 3600,
      },
      headers: {
        Accept:
          "text/calendar,text/plain;q=0.9,*/*;q=0.8",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Não foi possível consultar o calendário do imóvel ${propertyId}.`
    );
  }

  const icalContent =
    await response.text();

  if (
    !icalContent.includes(
      "BEGIN:VCALENDAR"
    )
  ) {
    throw new Error(
      "O endereço configurado não retornou um calendário iCal válido."
    );
  }

  return parseBlockedPeriods(
    icalContent
  );
}