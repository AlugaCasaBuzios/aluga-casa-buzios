import { after } from "next/server";

import { getWhatsAppVerifyToken } from "@/lib/whatsapp/config";
import { handleWhatsAppInboundEvent } from "@/lib/whatsapp/handler";
import { isValidMetaSignature } from "@/lib/whatsapp/meta";
import { parseWhatsAppWebhook } from "@/lib/whatsapp/webhookPayload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    token === getWhatsAppVerifyToken() &&
    challenge
  ) {
    return new Response(challenge, { status: 200 });
  }

  return Response.json({ error: "Verificação inválida." }, { status: 403 });
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  if (!isValidMetaSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return Response.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const events = parseWhatsAppWebhook(payload);
  after(async () => {
    const results = await Promise.allSettled(
      events.map((event) => handleWhatsAppInboundEvent(event))
    );
    results.forEach((result) => {
      if (result.status === "rejected") {
        console.error("Falha ao processar evento do WhatsApp:", result.reason);
      }
    });
  });

  return Response.json({ received: true });
}
