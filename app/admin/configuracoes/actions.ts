"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  parseEmailList,
  PRICE_REVIEW_RECIPIENTS_SETTING,
  runPriceReviewReminder,
} from "@/lib/pricing/priceReviewReminder";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

const PAGE = "/admin/configuracoes";

export async function savePriceReviewRecipients(
  formData: FormData
): Promise<void> {
  const { userId } = await requireAdmin();

  const rawValue = formData.get("recipients");
  const rawText =
    typeof rawValue === "string"
      ? rawValue.trim()
      : "";

  const recipients =
    parseEmailList(rawText);

  if (rawText && recipients.length === 0) {
    redirect(`${PAGE}?erro=emails`);
  }

  const supabase =
    createSupabaseAdminClient();

  /*
   * Lista vazia remove a configuração e o
   * lembrete volta a usar a variável de ambiente.
   */
  const { error } =
    recipients.length === 0
      ? await supabase
          .from("admin_settings")
          .delete()
          .eq(
            "key",
            PRICE_REVIEW_RECIPIENTS_SETTING
          )
      : await supabase
          .from("admin_settings")
          .upsert({
            key: PRICE_REVIEW_RECIPIENTS_SETTING,
            value: recipients,
            updated_by: userId,
          });

  if (error) {
    console.error(
      "Erro ao salvar destinatários do lembrete:",
      error.message
    );

    redirect(`${PAGE}?erro=salvar`);
  }

  revalidatePath(PAGE);
  redirect(`${PAGE}?salvo=1`);
}

/**
 * Envia o lembrete agora, mesmo que a semana
 * já tenha recebido um.
 */
export async function sendPriceReviewReminderNow(): Promise<void> {
  await requireAdmin();

  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "alugacasabuzios.com.br";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    "https";

  const result =
    await runPriceReviewReminder({
      force: true,
      baseUrl: `${protocol}://${host}`,
    });

  revalidatePath(PAGE);
  redirect(
    `${PAGE}?envio=${encodeURIComponent(
      result.status
    )}`
  );
}
