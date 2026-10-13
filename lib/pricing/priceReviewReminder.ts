import "server-only";

import { Resend } from "resend";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const PRICE_REVIEW_THRESHOLD_DAYS = 14;

export const PRICE_REVIEW_RECIPIENTS_SETTING =
  "price_review_recipients";

const SENDER =
  "Aluga Casa Búzios <precos@notificacoes.alugacasabuzios.com.br>";

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PropertyPendingReview {
  id: string;
  name: string;
  reviewedAt: string | null;
  daysSinceReview: number | null;
}

export interface PriceReviewReminderResult {
  status:
    | "sent"
    | "dry-run"
    | "nothing-to-review"
    | "already-sent"
    | "no-recipients"
    | "not-configured"
    | "error";
  weekKey: string;
  recipientCount: number;
  properties: PropertyPendingReview[];
  message: string;
}

function escapeHtml(
  value: string
): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function parseEmailList(
  value: unknown
): string[] {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,;\s]+/)
      : [];

  return Array.from(
    new Set(
      items
        .map((item) =>
          String(item).trim().toLowerCase()
        )
        .filter((item) =>
          EMAIL_PATTERN.test(item)
        )
    )
  );
}

/**
 * Destinatários configurados no painel.
 * Sem configuração, usa a variável
 * PRICE_REVIEW_NOTIFICATION_EMAIL.
 */
export async function getPriceReviewRecipients(): Promise<{
  recipients: string[];
  source: "painel" | "variavel" | "nenhum";
}> {
  const supabase =
    createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("admin_settings")
    .select("value")
    .eq(
      "key",
      PRICE_REVIEW_RECIPIENTS_SETTING
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Erro ao carregar destinatários do lembrete:",
      error
    );
  }

  const fromSettings = parseEmailList(
    data?.value
  );

  if (fromSettings.length > 0) {
    return {
      recipients: fromSettings,
      source: "painel",
    };
  }

  const fromEnvironment = parseEmailList(
    process.env
      .PRICE_REVIEW_NOTIFICATION_EMAIL ?? ""
  );

  return {
    recipients: fromEnvironment,
    source:
      fromEnvironment.length > 0
        ? "variavel"
        : "nenhum",
  };
}

/**
 * Semana ISO (ex.: 2026-W42) no fuso de Búzios.
 * Garante no máximo um lembrete por semana.
 */
export function getWeekKey(
  date = new Date()
): string {
  const localDate = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(date);

  const [year, month, day] = localDate
    .split("-")
    .map(Number);

  const target = new Date(
    Date.UTC(year, month - 1, day)
  );

  const weekday =
    target.getUTCDay() || 7;

  target.setUTCDate(
    target.getUTCDate() + 4 - weekday
  );

  const yearStart = new Date(
    Date.UTC(target.getUTCFullYear(), 0, 1)
  );

  const week = Math.ceil(
    ((target.getTime() - yearStart.getTime()) /
      86_400_000 +
      1) /
      7
  );

  return `${target.getUTCFullYear()}-W${String(
    week
  ).padStart(2, "0")}`;
}

/**
 * Imóveis ativos cujos preços não foram
 * conferidos nos últimos 14 dias.
 */
export async function getPropertiesPendingReview(
  now = new Date()
): Promise<PropertyPendingReview[]> {
  const supabase =
    createSupabaseAdminClient();

  const [pricingResult, catalogResult] =
    await Promise.all([
      supabase
        .from("property_pricing")
        .select(
          "property_id, property_name, pricing_reviewed_at, active"
        )
        .eq("active", true),

      supabase
        .from("property_catalog")
        .select("id, title")
        .eq("active", true),
    ]);

  if (pricingResult.error) {
    throw pricingResult.error;
  }

  if (catalogResult.error) {
    throw catalogResult.error;
  }

  const activeTitles = new Map(
    (catalogResult.data ?? []).map(
      (row) => [
        String(row.id),
        String(row.title),
      ]
    )
  );

  const limit =
    now.getTime() -
    PRICE_REVIEW_THRESHOLD_DAYS *
      86_400_000;

  return (pricingResult.data ?? [])
    .filter((row) =>
      activeTitles.has(
        String(row.property_id)
      )
    )
    .map((row) => {
      const reviewedAt =
        row.pricing_reviewed_at as
          | string
          | null;

      const reviewedTime = reviewedAt
        ? new Date(reviewedAt).getTime()
        : null;

      return {
        id: String(row.property_id),
        name:
          activeTitles.get(
            String(row.property_id)
          ) ??
          String(row.property_name),
        reviewedAt,
        reviewedTime,
        daysSinceReview:
          reviewedTime === null
            ? null
            : Math.floor(
                (now.getTime() -
                  reviewedTime) /
                  86_400_000
              ),
      };
    })
    .filter(
      (property) =>
        property.reviewedTime === null ||
        property.reviewedTime < limit
    )
    .sort(
      (first, second) =>
        (first.reviewedTime ?? 0) -
        (second.reviewedTime ?? 0)
    )
    .map(
      ({ id, name, reviewedAt, daysSinceReview }) => ({
        id,
        name,
        reviewedAt,
        daysSinceReview,
      })
    );
}

function describeReview(
  property: PropertyPendingReview
): string {
  return property.daysSinceReview === null
    ? "nunca conferido"
    : `conferido há ${property.daysSinceReview} dias`;
}

function buildEmail(
  properties: PropertyPendingReview[],
  baseUrl: string
): {
  subject: string;
  text: string;
  html: string;
} {
  const subject =
    properties.length === 1
      ? "1 imóvel com preços para conferir"
      : `${properties.length} imóveis com preços para conferir`;

  const linkFor = (id: string) =>
    `${baseUrl}/admin/precos/${encodeURIComponent(id)}`;

  const text = [
    "Lembrete semanal de revisão de preços",
    "",
    `Os imóveis abaixo não têm os preços conferidos com o Airbnb há mais de ${PRICE_REVIEW_THRESHOLD_DAYS} dias:`,
    "",
    ...properties.map(
      (property) =>
        `- ${property.name} (${describeReview(property)}): ${linkFor(property.id)}`
    ),
    "",
    "Abra cada link, compare com o calendário do Airbnb e clique em \"Conferi, preços estão iguais ao Airbnb\".",
  ].join("\n");

  const rows = properties
    .map(
      (property) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7;">
            <a href="${escapeHtml(linkFor(property.id))}" style="color: #172554; font-weight: bold;">
              ${escapeHtml(property.name)}
            </a>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; color: #52525b;">
            ${escapeHtml(describeReview(property))}
          </td>
        </tr>`
    )
    .join("");

  const html = `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(subject)}</title>
      </head>
      <body style="margin: 0; padding: 24px; background-color: #f4f4f5; font-family: Arial, Helvetica, sans-serif; color: #18181b;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 24px;">
          <p style="margin: 0; font-size: 12px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #1e3a8a;">
            Aluga Casa Búzios
          </p>
          <h1 style="margin: 8px 0 16px; font-size: 22px; color: #172554;">
            Preços para conferir
          </h1>
          <p style="margin: 0 0 16px; line-height: 1.5;">
            Estes imóveis não têm os preços conferidos com o Airbnb há mais de
            ${PRICE_REVIEW_THRESHOLD_DAYS} dias:
          </p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            ${rows}
          </table>
          <p style="margin: 16px 0 0; line-height: 1.5; color: #52525b; font-size: 14px;">
            Abra cada imóvel, compare com o calendário do Airbnb e clique em
            <strong>"Conferi, preços estão iguais ao Airbnb"</strong>.
          </p>
        </div>
      </body>
    </html>`;

  return { subject, text, html };
}

/**
 * Executa o lembrete semanal.
 *
 * dryRun: só lista os imóveis, não envia.
 * force: envia mesmo que a semana já tenha
 * recebido lembrete.
 */
export async function runPriceReviewReminder({
  dryRun = false,
  force = false,
  baseUrl,
  now = new Date(),
}: {
  dryRun?: boolean;
  force?: boolean;
  baseUrl: string;
  now?: Date;
}): Promise<PriceReviewReminderResult> {
  const weekKey = getWeekKey(now);

  const [properties, { recipients }] =
    await Promise.all([
      getPropertiesPendingReview(now),
      getPriceReviewRecipients(),
    ]);

  const base = {
    weekKey,
    recipientCount: recipients.length,
    properties,
  };

  if (dryRun) {
    return {
      ...base,
      status: "dry-run",
      message:
        "Simulação: nenhum e-mail foi enviado.",
    };
  }

  if (properties.length === 0) {
    return {
      ...base,
      status: "nothing-to-review",
      message:
        "Todos os imóveis foram conferidos nos últimos 14 dias.",
    };
  }

  if (recipients.length === 0) {
    return {
      ...base,
      status: "no-recipients",
      message:
        "Nenhum destinatário configurado.",
    };
  }

  const resendApiKey =
    process.env.RESEND_API_KEY?.trim();

  if (!resendApiKey) {
    return {
      ...base,
      status: "not-configured",
      message:
        "RESEND_API_KEY não configurada.",
    };
  }

  const supabase =
    createSupabaseAdminClient();

  /*
   * Reserva a semana antes de enviar: se a
   * Vercel chamar o cron duas vezes, a segunda
   * chamada encontra o registro e não envia.
   */
  const logKey = force
    ? `${weekKey}-manual-${now.getTime()}`
    : weekKey;

  const { error: claimError } = await supabase
    .from("price_review_reminder_log")
    .insert({
      week_key: logKey,
      recipients,
      property_ids: properties.map(
        (property) => property.id
      ),
    });

  if (claimError) {
    if (claimError.code === "23505") {
      return {
        ...base,
        status: "already-sent",
        message:
          "O lembrete desta semana já foi enviado.",
      };
    }

    console.error(
      "Erro ao registrar lembrete de preços:",
      claimError
    );

    return {
      ...base,
      status: "error",
      message:
        "Não foi possível registrar o envio.",
    };
  }

  const email = buildEmail(
    properties,
    baseUrl
  );

  try {
    const { error } = await new Resend(
      resendApiKey
    ).emails.send({
      from: SENDER,
      to: recipients,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error(
      "Erro do Resend ao enviar lembrete de preços:",
      error
    );

    /*
     * Libera a semana para uma nova tentativa.
     */
    await supabase
      .from("price_review_reminder_log")
      .delete()
      .eq("week_key", logKey);

    return {
      ...base,
      status: "error",
      message:
        "O envio do e-mail falhou.",
    };
  }

  return {
    ...base,
    status: "sent",
    message: `Lembrete enviado para ${recipients.length} destinatário(s).`,
  };
}
