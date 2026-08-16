import { getPropertyQuote } from "@/lib/pricing/getPropertyQuote";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface QuoteRequestBody {
  propertyId?: unknown;
  checkIn?: unknown;
  checkOut?: unknown;
  referenceDate?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as QuoteRequestBody;
    const result = await getPropertyQuote({
      propertyId:
        typeof body.propertyId === "string" ? body.propertyId : "",
      checkIn: typeof body.checkIn === "string" ? body.checkIn : "",
      checkOut: typeof body.checkOut === "string" ? body.checkOut : "",
      referenceDate:
        typeof body.referenceDate === "string"
          ? body.referenceDate
          : body.referenceDate === undefined
            ? undefined
            : "",
    });

    return Response.json(result.body, { status: result.status });
  } catch (error) {
    console.error(
      "Erro ao interpretar solicitação de orçamento:",
      error
    );

    return Response.json(
      {
        success: false,
        error: "Não foi possível interpretar a solicitação.",
      },
      { status: 400 }
    );
  }
}
