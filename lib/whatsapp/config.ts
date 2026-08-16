import "server-only";

export interface WhatsAppReadiness {
  accessToken: boolean;
  phoneNumberId: boolean;
  verifyToken: boolean;
  appSecret: boolean;
  ready: boolean;
}

export function getWhatsAppReadiness(): WhatsAppReadiness {
  const accessToken = Boolean(process.env.WHATSAPP_ACCESS_TOKEN?.trim());
  const phoneNumberId = Boolean(
    process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  );
  const verifyToken = Boolean(process.env.WHATSAPP_VERIFY_TOKEN?.trim());
  const appSecret = Boolean(process.env.META_APP_SECRET?.trim());

  return {
    accessToken,
    phoneNumberId,
    verifyToken,
    appSecret,
    ready: accessToken && phoneNumberId && verifyToken && appSecret,
  };
}

export function getWhatsAppGraphApiVersion(): string {
  return process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || "v23.0";
}

export function getWhatsAppPhoneNumberId(): string {
  const value = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!value) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID não foi configurada.");
  }
  return value;
}

export function getWhatsAppVerifyToken(): string {
  return process.env.WHATSAPP_VERIFY_TOKEN?.trim() || "";
}

export function getMetaAppSecret(): string {
  return process.env.META_APP_SECRET?.trim() || "";
}

export function getWhatsAppAccessToken(): string {
  const value = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  if (!value) {
    throw new Error("WHATSAPP_ACCESS_TOKEN não foi configurada.");
  }
  return value;
}
