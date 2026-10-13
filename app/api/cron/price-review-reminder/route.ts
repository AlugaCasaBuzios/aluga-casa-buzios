import { runPriceReviewReminder } from "@/lib/pricing/priceReviewReminder";
import { safeCompare } from "@/lib/security/safeCompare";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Lembrete semanal de revisão de preços.
 *
 * Chamado pelo cron da Vercel (vercel.json), que
 * envia "Authorization: Bearer <CRON_SECRET>".
 *
 * ?dryRun=1 lista os imóveis sem enviar.
 * ?force=1 envia mesmo que a semana já tenha
 * recebido lembrete.
 */
export async function GET(
  request: Request
): Promise<Response> {
  const cronSecret =
    process.env.CRON_SECRET?.trim() ?? "";

  const authorization =
    request.headers.get("authorization") ?? "";

  if (
    !cronSecret ||
    !safeCompare(
      authorization,
      `Bearer ${cronSecret}`
    )
  ) {
    return Response.json(
      {
        success: false,
        error: "Não autorizado.",
      },
      {
        status: 401,
      }
    );
  }

  const url = new URL(request.url);

  try {
    const result =
      await runPriceReviewReminder({
        dryRun:
          url.searchParams.get("dryRun") === "1",
        force:
          url.searchParams.get("force") === "1",
        baseUrl: url.origin,
      });

    return Response.json(
      {
        success: result.status !== "error",
        ...result,
      },
      {
        status:
          result.status === "error"
            ? 500
            : 200,
      }
    );
  } catch (error) {
    console.error(
      "Falha no lembrete de revisão de preços:",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          "Não foi possível executar o lembrete.",
      },
      {
        status: 500,
      }
    );
  }
}
