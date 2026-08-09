"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabaseServer";

const STATUSES = [
  "Aberto",
  "Em andamento",
  "Aguardando peça",
  "Concluído",
  "Cancelado",
] as const;

type MaintenanceStatus = (typeof STATUSES)[number];

function getTextValue(
  formData: FormData,
  fieldName: string
): string {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value.trim() : "";
}

function isStatus(
  value: string
): value is MaintenanceStatus {
  return STATUSES.includes(value as MaintenanceStatus);
}

function parseMoney(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  let normalized = trimmed
    .replace(/\s/g, "")
    .replace(/^R\$/i, "");

  if (normalized.includes(",")) {
    normalized = normalized
      .replace(/\./g, "")
      .replace(",", ".");
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

function parseAttachmentPaths(
  formData: FormData,
  ticketId: string
): string[] | null {
  const raw = getTextValue(
    formData,
    "attachmentPaths"
  );

  if (!raw) {
    return [];
  }

  const paths = raw
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (paths.length > 8) {
    return null;
  }

  const requiredPrefix = `tickets/${ticketId}/`;

  if (
    paths.some(
      (path) =>
        !path.startsWith(requiredPrefix) ||
        path.includes("..")
    )
  ) {
    return null;
  }

  return paths;
}

async function requireTeamUser() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/equipe/login");
  }

  const { data: profile, error } = await supabase
    .from("management_users")
    .select("user_id, full_name, role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !profile?.active) {
    await supabase.auth.signOut();
    redirect("/equipe/login?erro=acesso");
  }

  return { supabase, user, profile };
}

function revalidateTicket(ticketId: string) {
  revalidatePath("/equipe/manutencao");
  revalidatePath(`/equipe/manutencao/${ticketId}`);
  revalidatePath("/admin/manutencao");
  revalidatePath(`/admin/manutencao/${ticketId}`);
}

export async function addTeamMaintenanceDetailUpdate(
  formData: FormData
): Promise<void> {
  const ticketId = getTextValue(formData, "ticketId");
  const statusValue = getTextValue(formData, "status");
  const comment = getTextValue(formData, "comment");
  const finalCostValue = getTextValue(
    formData,
    "finalCost"
  );

  if (
    !ticketId ||
    !isStatus(statusValue) ||
    !comment
  ) {
    redirect(
      `/equipe/manutencao/${ticketId || ""}?erro=atualizacao`
    );
  }

  const finalCost = parseMoney(finalCostValue);

  if (
    finalCostValue &&
    finalCost === null
  ) {
    redirect(
      `/equipe/manutencao/${ticketId}?erro=valor`
    );
  }

  const uploadStatus = getTextValue(
    formData,
    "attachmentUploadStatus"
  );

  if (uploadStatus === "pending") {
    redirect(
      `/equipe/manutencao/${ticketId}?erro=arquivo`
    );
  }

  const attachmentPaths = parseAttachmentPaths(
    formData,
    ticketId
  );

  if (attachmentPaths === null) {
    redirect(
      `/equipe/manutencao/${ticketId}?erro=arquivo`
    );
  }

  const { supabase, user } = await requireTeamUser();

  const {
    data: ticket,
    error: ticketError,
  } = await supabase
    .from("maintenance_tickets")
    .select("id, status, completed_at")
    .eq("id", ticketId)
    .maybeSingle();

  if (ticketError || !ticket) {
    redirect(
      `/equipe/manutencao/${ticketId}?erro=chamado`
    );
  }

  const completedAt =
    statusValue === "Concluído"
      ? ticket.completed_at ??
        new Date().toISOString()
      : null;

  const updatePayload: {
    status: MaintenanceStatus;
    completed_at: string | null;
    updated_by: string;
    final_cost?: number;
  } = {
    status: statusValue,
    completed_at: completedAt,
    updated_by: user.id,
  };

  if (finalCost !== null) {
    updatePayload.final_cost = finalCost;
  }

  const { error: updateError } = await supabase
    .from("maintenance_tickets")
    .update(updatePayload)
    .eq("id", ticketId);

  if (updateError) {
    console.error(
      "Erro ao atualizar chamado pela equipe:",
      updateError
    );

    redirect(
      `/equipe/manutencao/${ticketId}?erro=atualizacao`
    );
  }

  const { error: historyError } = await supabase
    .from("maintenance_updates")
    .insert({
      ticket_id: ticketId,
      status: statusValue,
      comment,
      attachment_paths: attachmentPaths,
      created_by: user.id,
    });

  if (historyError) {
    console.error(
      "Erro ao registrar histórico da manutenção:",
      historyError
    );

    redirect(
      `/equipe/manutencao/${ticketId}?erro=historico`
    );
  }

  revalidateTicket(ticketId);
  redirect(
    `/equipe/manutencao/${ticketId}?salvo=1`
  );
}
