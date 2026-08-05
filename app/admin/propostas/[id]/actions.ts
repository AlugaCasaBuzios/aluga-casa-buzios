"use server";

import {
  revalidatePath,
} from "next/cache";

import { redirect } from "next/navigation";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

const allowedStatuses =
  new Set([
    "new",
    "contacted",
    "evaluating",
    "approved",
    "rejected",
  ]);

function getFormText(
  formData: FormData,
  fieldName: string
): string {
  const value =
    formData.get(fieldName);

  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value.trim();
}

function isValidUuid(
  value: string
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function updateProposal(
  formData: FormData
) {
  const authenticationClient =
    await createSupabaseServerClient();

  const {
    data: { user },
  } =
    await authenticationClient.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const proposalId =
    getFormText(
      formData,
      "proposal_id"
    );

  const status =
    getFormText(
      formData,
      "status"
    );

  const internalNotes =
    getFormText(
      formData,
      "internal_notes"
    ).slice(0, 5000);

  if (!isValidUuid(proposalId)) {
    throw new Error(
      "Identificador da proposta inválido."
    );
  }

  if (
    !allowedStatuses.has(status)
  ) {
    throw new Error(
      "Status da proposta inválido."
    );
  }

  const supabase =
    createSupabaseAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "property_management_leads"
    )
    .update({
      status,
      internal_notes:
        internalNotes || null,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", proposalId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(
      "Erro ao atualizar proposta:",
      error
    );

    throw new Error(
      "Não foi possível atualizar a proposta."
    );
  }

  if (!data) {
    throw new Error(
      "A proposta não foi encontrada."
    );
  }

  revalidatePath(
    "/admin/propostas"
  );

  revalidatePath(
    `/admin/propostas/${proposalId}`
  );

  redirect(
    `/admin/propostas/${proposalId}?salvo=1`
  );
}