import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import {
  getMetaAppSecret,
  getWhatsAppAccessToken,
  getWhatsAppGraphApiVersion,
} from "@/lib/whatsapp/config";

interface MetaMessageResponse {
  messages?: Array<{ id?: string }>;
  error?: { message?: string; code?: number };
}

function splitMessage(message: string): string[] {
  const normalized = message.trim();
  if (normalized.length <= 4000) {
    return [normalized];
  }

  const chunks: string[] = [];
  let remaining = normalized;
  while (remaining.length > 4000) {
    let splitAt = remaining.lastIndexOf("\n", 4000);
    if (splitAt < 1000) {
      splitAt = remaining.lastIndexOf(" ", 4000);
    }
    if (splitAt < 1000) {
      splitAt = 4000;
    }
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  if (remaining) {
    chunks.push(remaining);
  }
  return chunks;
}

async function postToMeta(
  phoneNumberId: string,
  payload: Record<string, unknown>
): Promise<MetaMessageResponse> {
  const response = await fetch(
    `https://graph.facebook.com/${getWhatsAppGraphApiVersion()}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getWhatsAppAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
      cache: "no-store",
    }
  );

  const data = (await response.json()) as MetaMessageResponse;
  if (!response.ok) {
    throw new Error(
      data.error?.message || `A Meta respondeu com o status ${response.status}.`
    );
  }
  return data;
}

export async function sendWhatsAppText(input: {
  phoneNumberId: string;
  to: string;
  text: string;
}): Promise<string[]> {
  const messageIds: string[] = [];
  for (const chunk of splitMessage(input.text)) {
    const response = await postToMeta(input.phoneNumberId, {
      to: input.to,
      type: "text",
      text: { preview_url: false, body: chunk },
    });
    const messageId = response.messages?.[0]?.id;
    if (messageId) {
      messageIds.push(messageId);
    }
  }
  return messageIds;
}

export async function markWhatsAppMessageRead(input: {
  phoneNumberId: string;
  messageId: string;
}): Promise<void> {
  await postToMeta(input.phoneNumberId, {
    status: "read",
    message_id: input.messageId,
  });
}

export function isValidMetaSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = getMetaAppSecret();
  if (!secret || !signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const received = signatureHeader.slice("sha256=".length);
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (received.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}
