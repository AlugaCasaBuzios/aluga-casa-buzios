import { buildBlockedCalendar } from "@/lib/availability/buildIcal";
import { safeCompare } from "@/lib/security/safeCompare";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface IcalRouteContext {
  params: Promise<{
    propertyId: string;
    file: string;
  }>;
}

const TOKEN_FILE_PATTERN =
  /^([0-9a-f]{64})\.ics$/;

/*
 * Qualquer falha responde 404, sem indicar
 * se o imóvel existe ou se o token está errado.
 */
function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function getTodayInBuzios(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Exportação iCal dos bloqueios manuais de um
 * imóvel, para importar no Airbnb.
 *
 * Só lê manual_availability_blocks: datas que
 * vieram do iCal do Airbnb nunca são exportadas
 * de volta, o que evita o loop entre calendários.
 */
export async function GET(
  _request: Request,
  context: IcalRouteContext
): Promise<Response> {
  const { propertyId, file } =
    await context.params;

  const match = file.match(
    TOKEN_FILE_PATTERN
  );

  if (!match || !propertyId) {
    return notFound();
  }

  const receivedToken = match[1];

  try {
    const supabase =
      createSupabaseAdminClient();

    const { data: exportRow, error } =
      await supabase
        .from("property_ical_exports")
        .select("token, active")
        .eq("property_id", propertyId)
        .maybeSingle();

    if (
      error ||
      !exportRow ||
      !exportRow.active ||
      !safeCompare(
        receivedToken,
        String(exportRow.token)
      )
    ) {
      return notFound();
    }

    const { data: blocks, error: blocksError } =
      await supabase
        .from("manual_availability_blocks")
        .select(
          "id, start_date, end_date_exclusive"
        )
        .eq("property_id", propertyId)
        .eq("active", true)
        .gt(
          "end_date_exclusive",
          getTodayInBuzios()
        )
        .order("start_date", {
          ascending: true,
        });

    if (blocksError) {
      console.error(
        "Erro ao carregar bloqueios para exportação iCal:",
        blocksError.message
      );

      return new Response(
        "Calendar temporarily unavailable",
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": "600",
          },
        }
      );
    }

    const calendar = buildBlockedCalendar(
      (blocks ?? []).map((block) => ({
        id: String(block.id),
        startDate: String(block.start_date),
        endDateExclusive: String(
          block.end_date_exclusive
        ),
      }))
    );

    await supabase
      .from("property_ical_exports")
      .update({
        last_fetched_at:
          new Date().toISOString(),
      })
      .eq("property_id", propertyId);

    return new Response(calendar, {
      status: 200,
      headers: {
        "Content-Type":
          "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="${propertyId}.ics"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    console.error(
      "Falha na exportação iCal:",
      error instanceof Error
        ? error.message
        : "erro desconhecido"
    );

    return notFound();
  }
}
