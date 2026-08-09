"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabaseServer";

const PRIORITIES = ["Baixa", "Média", "Alta", "Urgente"] as const;
const STATUSES = [
  "Aberto",
  "Em andamento",
  "Aguardando peça",
  "Concluído",
  "Cancelado",
] as const;

type MaintenancePriority = (typeof PRIORITIES)[number];
type MaintenanceStatus = (typeof STATUSES)[number];

function getTextValue(
  formData: FormData,
  fieldName: string
): string {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value.trim() : "";
}

function isPriority(
  value: string
): value is MaintenancePriority {
  return PRIORITIES.includes(value as MaintenancePriority);
}

function isStatus(
  value: string
): value is MaintenanceStatus {
  return STATUSES.includes(value as MaintenanceStatus);
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsedDate = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
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

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile, error } = await supabase
    .from("management_users")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    error ||
    !profile?.active ||
    profile.role !== "admin"
  ) {
    redirect("/admin");
  }

  return { supabase, user };
}

function revalidateTicket(ticketId: string) {
  revalidatePath("/admin/manutencao");
  revalidatePath(`/admin/manutencao/${ticketId}`);
  revalidatePath("/equipe/manutencao");
  revalidatePath(`/equipe/manutencao/${ticketId}`);
}

export async function updateAdminMaintenanceDetails(
  formData: FormData
): Promise<void> {
  const ticketId = getTextValue(formData, "ticketId");
  const priorityValue = getTextValue(
    formData,
    "priority"
  );
  const assignedTo = getTextValue(
    formData,
    "assignedTo"
  );
  const dueDate = getTextValue(formData, "dueDate");
  const estimatedCostValue = getTextValue(
    formData,
    "estimatedCost"
  );
  const chargeOwner =
    formData.get("chargeOwner") === "on";
  const visibleToOwner =
    formData.get("visibleToOwner") === "on";

  if (!ticketId || !isPriority(priorityValue)) {
    redirect(
      `/admin/manutencao/${ticketId || ""}?erro=campos`
    );
  }

  if (dueDate && !isValidDateOnly(dueDate)) {
    redirect(
      `/admin/manutencao/${ticketId}?erro=prazo`
    );
  }

  const estimatedCost = parseMoney(
    estimatedCostValue
  );

  if (
    estimatedCostValue &&
    estimatedCost === null
  ) {
    redirect(
      `/admin/manutencao/${ticketId}?erro=valor`
    );
  }

  const { supabase, user } = await requireAdmin();

  const {
    data: existingTicket,
    error: existingTicketError,
  } = await supabase
    .from("maintenance_tickets")
    .select(
      "id, priority, assigned_to, due_date, estimated_cost, charge_owner, visible_to_owner"
    )
    .eq("id", ticketId)
    .maybeSingle();

  if (existingTicketError || !existingTicket) {
    redirect(
      `/admin/manutencao/${ticketId}?erro=chamado`
    );
  }

  let assignedUserId: string | null = null;

  if (assignedTo) {
    const {
      data: assignedUser,
      error: assignedError,
    } = await supabase
      .from("management_users")
      .select("user_id")
      .eq("user_id", assignedTo)
      .eq("active", true)
      .maybeSingle();

    if (assignedError || !assignedUser) {
      redirect(
        `/admin/manutencao/${ticketId}?erro=responsavel`
      );
    }

    assignedUserId = assignedUser.user_id;
  }

  const { error } = await supabase
    .from("maintenance_tickets")
    .update({
      priority: priorityValue,
      assigned_to: assignedUserId,
      due_date: dueDate || null,
      estimated_cost: estimatedCost,
      charge_owner: chargeOwner,
      visible_to_owner: visibleToOwner,
      updated_by: user.id,
    })
    .eq("id", ticketId);

  if (error) {
    console.error(
      "Erro ao atualizar dados do chamado:",
      error
    );

    redirect(
      `/admin/manutencao/${ticketId}?erro=salvar`
    );
  }

  const changes: string[] = [];

  if (existingTicket.priority !== priorityValue) {
    changes.push(
      `prioridade: ${existingTicket.priority} → ${priorityValue}`
    );
  }

  if (existingTicket.assigned_to !== assignedUserId) {
    changes.push("responsável alterado");
  }

  if ((existingTicket.due_date ?? "") !== dueDate) {
    changes.push(
      `prazo: ${existingTicket.due_date ?? "sem prazo"} → ${
        dueDate || "sem prazo"
      }`
    );
  }

  const oldEstimatedCost =
    existingTicket.estimated_cost === null
      ? null
      : Number(existingTicket.estimated_cost);

  if (oldEstimatedCost !== estimatedCost) {
    changes.push("custo estimado alterado");
  }

  if (existingTicket.charge_owner !== chargeOwner) {
    changes.push(
      `desconto do proprietário: ${
        chargeOwner ? "Sim" : "Não"
      }`
    );
  }

  if (
    existingTicket.visible_to_owner !== visibleToOwner
  ) {
    changes.push(
      `visível ao proprietário: ${
        visibleToOwner ? "Sim" : "Não"
      }`
    );
  }

  if (changes.length > 0) {
    const { error: historyError } = await supabase
      .from("maintenance_updates")
      .insert({
        ticket_id: ticketId,
        status: null,
        comment: `Dados do chamado atualizados: ${changes.join(
          "; "
        )}.`,
        created_by: user.id,
      });

    if (historyError) {
      console.error(
        "Erro ao registrar alteração dos dados no histórico:",
        historyError
      );
    }
  }

  revalidateTicket(ticketId);
  redirect(
    `/admin/manutencao/${ticketId}?dados=1`
  );
}

export async function addAdminMaintenanceUpdate(
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
      `/admin/manutencao/${ticketId || ""}?erro=atualizacao`
    );
  }

  const finalCost = parseMoney(finalCostValue);

  if (
    finalCostValue &&
    finalCost === null
  ) {
    redirect(
      `/admin/manutencao/${ticketId}?erro=valor`
    );
  }

  const uploadStatus = getTextValue(
    formData,
    "attachmentUploadStatus"
  );

  if (uploadStatus === "pending") {
    redirect(
      `/admin/manutencao/${ticketId}?erro=arquivo`
    );
  }

  const attachmentPaths = parseAttachmentPaths(
    formData,
    ticketId
  );

  if (attachmentPaths === null) {
    redirect(
      `/admin/manutencao/${ticketId}?erro=arquivo`
    );
  }

  const { supabase, user } = await requireAdmin();

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
      `/admin/manutencao/${ticketId}?erro=chamado`
    );
  }

  const completedAt =
    statusValue === "Concluído"
      ? ticket.completed_at ??
        new Date().toISOString()
      : null;

  const payload: {
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
    payload.final_cost = finalCost;
  }

  const { error: updateError } = await supabase
    .from("maintenance_tickets")
    .update(payload)
    .eq("id", ticketId);

  if (updateError) {
    console.error(
      "Erro ao atualizar chamado:",
      updateError
    );

    redirect(
      `/admin/manutencao/${ticketId}?erro=atualizacao`
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
      "Erro ao registrar histórico do chamado:",
      historyError
    );

    redirect(
      `/admin/manutencao/${ticketId}?erro=historico`
    );
  }

  revalidateTicket(ticketId);
  redirect(
    `/admin/manutencao/${ticketId}?salvo=1`
  );
}
