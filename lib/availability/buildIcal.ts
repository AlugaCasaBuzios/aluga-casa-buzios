export interface IcalBlockedPeriod {
  id: string;

  /**
   * Primeiro dia bloqueado (YYYY-MM-DD).
   */
  startDate: string;

  /**
   * Dia seguinte ao último bloqueado (YYYY-MM-DD),
   * igual ao DTEND exclusivo do iCal.
   */
  endDateExclusive: string;
}

const CRLF = "\r\n";

function toIcalDate(
  date: string
): string {
  return date.replace(/-/g, "");
}

function toIcalTimestamp(
  date: Date
): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/*
 * RFC 5545: linhas com mais de 75 octetos
 * continuam na linha seguinte iniciada por espaço.
 */
function foldLine(
  line: string
): string {
  const bytes = Buffer.from(line, "utf8");

  if (bytes.length <= 75) {
    return line;
  }

  const parts: string[] = [];
  let current = "";

  for (const character of line) {
    const limit = parts.length === 0 ? 75 : 74;

    if (
      Buffer.byteLength(
        current + character,
        "utf8"
      ) > limit
    ) {
      parts.push(current);
      current = character;
    } else {
      current += character;
    }
  }

  parts.push(current);

  return parts.join(`${CRLF} `);
}

/**
 * Gera um calendário iCal só com as datas
 * bloqueadas. Cada evento tem apenas
 * "Bloqueado" como título: nenhum dado de
 * hóspede ou motivo do bloqueio é exportado.
 */
export function buildBlockedCalendar(
  periods: IcalBlockedPeriod[],
  generatedAt = new Date()
): string {
  const timestamp =
    toIcalTimestamp(generatedAt);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aluga Casa Buzios//Bloqueios//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const period of periods) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${period.id}@alugacasabuzios.com.br`,
      `DTSTAMP:${timestamp}`,
      `DTSTART;VALUE=DATE:${toIcalDate(period.startDate)}`,
      `DTEND;VALUE=DATE:${toIcalDate(period.endDateExclusive)}`,
      "SUMMARY:Bloqueado",
      "TRANSP:OPAQUE",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  return (
    lines.map(foldLine).join(CRLF) + CRLF
  );
}
