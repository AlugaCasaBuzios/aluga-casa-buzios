"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
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

function getTextValue(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value.trim() : "";
}

function isPriority(value: string): value is MaintenancePriority {
  return PRIORITIES.includes(value as MaintenancePriority);
}

function isStatus(value: string): value is MaintenanceStatus {
  return STATUSES.includes(value as MaintenanceStatus);
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

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

  let normalized = trimmed.replace(/\s/g, "").replace(/^R\$/i, "");

  if (normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

function addDaysToDateOnly(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getTodayDateOnly(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultDueDate(priority: MaintenancePriority): string {
  const today = getTodayDateOnly();

  switch (priority) {
    case "Urgente":
      return today;
    case "Alta":
      return addDaysToDateOnly(today, 1);
    case "Média":
      return addDaysToDateOnly(today, 3);
    case "Baixa":
      return addDaysToDateOnly(today, 7);
  }
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

  if (error) {
    console.error("Erro ao verificar perfil administrativo:", error);
    redirect("/admin?erro=permissao");
  }

  if (!profile?.active || profile.role !== "admin") {
    redirect("/admin");
  }

  return { supabase, user };
}

export async function createMaintenanceTicket(formData: FormData): Promise<void> {
  const propertyId = getTextValue(formData, "propertyId");
  const location = getTextValue(formData, "location");
  const category = getTextValue(formData, "category");
  const problem = getTextValue(formData, "problem");
  const priorityValue = getTextValue(formData, "priority");
  const assignedTo = getTextValue(formData, "assignedTo");
  const dueDateValue = getTextValue(formData, "dueDate");
  const estimatedCostValue = getTextValue(formData, "estimatedCost");
  const chargeOwner = formData.get("chargeOwner") === "on";
  const visibleToOwner = formData.get("visibleToOwner") === "on";

  if (!propertyId || !problem || !category) {
    redirect("/admin/manutencao?erro=campos");
  }

  if (!isPriority(priorityValue)) {
    redirect("/admin/manutencao?erro=campos");
  }

  const priority = priorityValue as MaintenancePriority;

  if (dueDateValue && !isValidDateOnly(dueDateValue)) {
    redirect("/admin/manutencao?erro=prazo");
  }

  const estimatedCost = parseMoney(estimatedCostValue);

  if (estimatedCostValue && estimatedCost === null) {
    redirect("/admin/manutencao?erro=valor");
  }

  const { supabase, user } = await requireAdmin();
  const adminSupabase = createSupabaseAdminClient();

  const { data: property, error: propertyError } = await adminSupabase
    .from("property_catalog")
    .select("id")
    .eq("id", propertyId)
    .maybeSingle();

  if (propertyError || !property) {
    console.error("Erro ao localizar imóvel para manutenção:", propertyError);
    redirect("/admin/manutencao?erro=imovel");
  }

  let assignedUserId: string | null = null;

  if (assignedTo) {
    const { data: assignedUser, error: assignedError } = await supabase
      .from("management_users")
      .select("user_id")
      .eq("user_id", assignedTo)
      .eq("active", true)
      .maybeSingle();

    if (assignedError || !assignedUser) {
      console.error("Erro ao localizar responsável pela manutenção:", assignedError);
      redirect("/admin/manutencao?erro=responsavel");
    }

    assignedUserId = assignedUser.user_id;
  }

  const dueDate = dueDateValue || getDefaultDueDate(priority);

  const { error } = await supabase.from("maintenance_tickets").insert({
    property_id: propertyId,
    location: location || null,
    category,
    problem,
    priority,
    assigned_to: assignedUserId,
    status: "Aberto",
    due_date: dueDate,
    estimated_cost: estimatedCost,
    charge_owner: chargeOwner,
    visible_to_owner: visibleToOwner,
    created_by: user.id,
    updated_by: user.id,
  });

  if (error) {
    console.error("Erro ao cadastrar chamado de manutenção:", error);
    redirect("/admin/manutencao?erro=salvar");
  }

  revalidatePath("/admin/manutencao");
  redirect("/admin/manutencao?criado=1");
}

export async function updateMaintenanceTicketStatus(formData: FormData): Promise<void> {
  const ticketId = getTextValue(formData, "ticketId");
  const statusValue = getTextValue(formData, "status");

  if (!ticketId || !isStatus(statusValue)) {
    redirect("/admin/manutencao?erro=status");
  }

  const { supabase, user } = await requireAdmin();
  const completedAt = statusValue === "Concluído" ? new Date().toISOString() : null;

  const { data: existingTicket, error: findError } = await supabase
    .from("maintenance_tickets")
    .select("id, status")
    .eq("id", ticketId)
    .maybeSingle();

  if (findError || !existingTicket) {
    console.error("Erro ao localizar chamado de manutenção:", findError);
    redirect("/admin/manutencao?erro=chamado");
  }

  const { error } = await supabase
    .from("maintenance_tickets")
    .update({
      status: statusValue,
      completed_at: completedAt,
      updated_by: user.id,
    })
    .eq("id", ticketId);

  if (error) {
    console.error("Erro ao atualizar status da manutenção:", error);
    redirect("/admin/manutencao?erro=atualizar");
  }

  if (existingTicket.status !== statusValue) {
    const { error: updateError } = await supabase.from("maintenance_updates").insert({
      ticket_id: ticketId,
      status: statusValue,
      comment: `Status alterado de ${existingTicket.status} para ${statusValue}.`,
      created_by: user.id,
    });

    if (updateError) {
      console.error("Erro ao registrar histórico da manutenção:", updateError);
    }
  }

  revalidatePath("/admin/manutencao");
  redirect("/admin/manutencao?salvo=1");
}
