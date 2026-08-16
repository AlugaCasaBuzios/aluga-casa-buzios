export interface WhatsAppInboundEvent {
  messageId: string;
  phoneNumberId: string;
  from: string;
  profileName: string | null;
  timestamp: string;
  messageType: string;
  text: string | null;
  rawMessage: Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extractText(message: Record<string, unknown>, type: string): string | null {
  if (type === "text") {
    return asString(asRecord(message.text)?.body);
  }
  if (type === "button") {
    return asString(asRecord(message.button)?.text);
  }
  if (type === "interactive") {
    const interactive = asRecord(message.interactive);
    const buttonReply = asRecord(interactive?.button_reply);
    const listReply = asRecord(interactive?.list_reply);
    return asString(buttonReply?.title) || asString(listReply?.title);
  }
  return null;
}

export function parseWhatsAppWebhook(payload: unknown): WhatsAppInboundEvent[] {
  const root = asRecord(payload);
  if (root?.object !== "whatsapp_business_account") {
    return [];
  }

  const events: WhatsAppInboundEvent[] = [];
  for (const entryValue of asArray(root.entry)) {
    const entry = asRecord(entryValue);
    for (const changeValue of asArray(entry?.changes)) {
      const change = asRecord(changeValue);
      const value = asRecord(change?.value);
      const metadata = asRecord(value?.metadata);
      const phoneNumberId = asString(metadata?.phone_number_id);
      const contacts = asArray(value?.contacts);
      const firstContact = asRecord(contacts[0]);
      const profile = asRecord(firstContact?.profile);

      if (!phoneNumberId) {
        continue;
      }

      for (const messageValue of asArray(value?.messages)) {
        const message = asRecord(messageValue);
        if (!message) {
          continue;
        }
        const messageId = asString(message.id);
        const from = asString(message.from);
        const timestamp = asString(message.timestamp);
        const messageType = asString(message.type) || "unknown";
        if (!messageId || !from || !timestamp) {
          continue;
        }

        events.push({
          messageId,
          phoneNumberId,
          from,
          profileName: asString(profile?.name),
          timestamp,
          messageType,
          text: extractText(message, messageType),
          rawMessage: message,
        });
      }
    }
  }

  return events;
}
