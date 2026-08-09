"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { syncMaintenanceFinancialEntry } from "@/lib/maintenanceFinancial";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const REPORT_STATUSES = ["draft", "closed", "sent"] as const;

type ReportStatus = (typeof REPORT_STATUSES)[number];

type ReturnContext = {
  propertyId: string;
  periodStart: string;
  periodEnd: string;
};

function getTextValue(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value.trim() : "";
}

function getBooleanValue(formData: FormData, fieldName: string): boolean {
  return formData.get(fieldName) === "on";
}

function isDateOnly(value: string): boolean {
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

function getReturnContext(formData: FormData): ReturnContext {
  return {
    propertyId: getTextValue(formData, "propertyId"),
    periodStart: getTextValue(formData, "periodStart"),
    periodEnd: getTextValue(formData, "periodEnd"),
  };
}

function buildReturnPath(
  context: ReturnContext,
  extra?: Record<string, string>
): string {
  const params = new URLSearchParams();

  if (context.propertyId) {
    params.set("imovel", context.propertyId);
  }

  if (context.periodStart) {
    params.set("inicio", context.periodStart);
  }

  if (context.periodEnd) {
    params.set("fim", context.periodEnd);
  }

  for (const [key, value] of Object.entries(extra ?? {})) {
    params.set(key, value);
  }

  const query = params.toString();
  return query ? `/admin/relatorios?${query}` : "/admin/relatorios";
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

  if (error || !profile?.active || profile.role !== "admin") {
    redirect("/equipe/manutencao");
  }

  return {
    user,
    adminSupabase: createSupabaseAdminClient(),
  };
}

export async function savePropertyOwner(formData: FormData): Promise<void> {
  const context = getReturnContext(formData);
  const ownerId = getTextValue(formData, "ownerId");
  const fullName = getTextValue(formData, "fullName");
  const email = getTextValue(formData, "email");
  const phone = getTextValue(formData, "phone");
  const whatsapp = getTextValue(formData, "whatsapp");
  const notes = getTextValue(formData, "notes");

  if (!context.propertyId || !fullName) {
    redirect(buildReturnPath(context, { erro: "proprietario-campos" }));
  }

  const { adminSupabase } = await requireAdmin();

  let savedOwnerId = ownerId;

  if (ownerId) {
    const { error } = await adminSupabase
      .from("property_owners")
      .update({
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        notes: notes || null,
        active: true,
      })
      .eq("id", ownerId);

    if (error) {
      console.error("Erro ao atualizar proprietário:", error);
      redirect(buildReturnPath(context, { erro: "proprietario-salvar" }));
    }
  } else {
    const { data, error } = await adminSupabase
      .from("property_owners")
      .insert({
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        notes: notes || null,
        active: true,
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      console.error("Erro ao cadastrar proprietário:", error);
      redirect(buildReturnPath(context, { erro: "proprietario-salvar" }));
    }

    savedOwnerId = data.id;
  }

  const { error: deleteLinkError } = await adminSupabase
    .from("property_owner_links")
    .delete()
    .eq("property_id", context.propertyId);

  if (deleteLinkError) {
    console.error("Erro ao redefinir vínculo do proprietário:", deleteLinkError);
    redirect(buildReturnPath(context, { erro: "proprietario-vinculo" }));
  }

  const { error: linkError } = await adminSupabase
    .from("property_owner_links")
    .insert({
      property_id: context.propertyId,
      owner_id: savedOwnerId,
      ownership_percentage: 100,
      is_primary: true,
    });

  if (linkError) {
    console.error("Erro ao vincular proprietário ao imóvel:", linkError);
    redirect(buildReturnPath(context, { erro: "proprietario-vinculo" }));
  }

  revalidatePath("/admin/relatorios");
  redirect(buildReturnPath(context, { salvo: "proprietario" }));
}

export async function createFinancialEntry(formData: FormData): Promise<void> {
  const context = getReturnContext(formData);
  const entryDate = getTextValue(formData, "entryDate");
  const entryType = getTextValue(formData, "entryType");
  const category = getTextValue(formData, "category");
  const channel = getTextValue(formData, "channel");
  const description = getTextValue(formData, "description");
  const amount = parseMoney(getTextValue(formData, "amount"));
  const reservationReference = getTextValue(formData, "reservationReference");
  const deductFromOwner = getBooleanValue(formData, "deductFromOwner");

  if (
    !context.propertyId ||
    !isDateOnly(entryDate) ||
    !["revenue", "expense"].includes(entryType) ||
    !category ||
    !description ||
    amount === null
  ) {
    redirect(buildReturnPath(context, { erro: "movimentacao-campos" }));
  }

  const { user, adminSupabase } = await requireAdmin();

  const { error } = await adminSupabase
    .from("property_financial_entries")
    .insert({
      property_id: context.propertyId,
      entry_date: entryDate,
      entry_type: entryType,
      category,
      channel: entryType === "revenue" ? channel || null : null,
      description,
      amount,
      deduct_from_owner: entryType === "expense" ? deductFromOwner : false,
      reservation_reference: reservationReference || null,
      created_by: user.id,
    });

  if (error) {
    console.error("Erro ao cadastrar movimentação financeira:", error);
    redirect(buildReturnPath(context, { erro: "movimentacao-salvar" }));
  }

  revalidatePath("/admin/relatorios");
  redirect(buildReturnPath(context, { salvo: "movimentacao" }));
}

export async function deleteFinancialEntry(formData: FormData): Promise<void> {
  const context = getReturnContext(formData);
  const entryId = getTextValue(formData, "entryId");

  if (!entryId) {
    redirect(buildReturnPath(context, { erro: "movimentacao-excluir" }));
  }

  const { adminSupabase } = await requireAdmin();

  const { data: entry, error: entryError } = await adminSupabase
    .from("property_financial_entries")
    .select("maintenance_ticket_id")
    .eq("id", entryId)
    .maybeSingle();

  if (entryError) {
    console.error("Erro ao localizar movimentação:", entryError);
    redirect(buildReturnPath(context, { erro: "movimentacao-excluir" }));
  }

  const { error } = await adminSupabase
    .from("property_financial_entries")
    .delete()
    .eq("id", entryId);

  if (error) {
    console.error("Erro ao excluir movimentação:", error);
    redirect(buildReturnPath(context, { erro: "movimentacao-excluir" }));
  }

  if (entry?.maintenance_ticket_id) {
    const { error: ticketError } = await adminSupabase
      .from("maintenance_tickets")
      .update({ posted_to_financial: false })
      .eq("id", entry.maintenance_ticket_id);

    if (ticketError) {
      console.error(
        "Movimentação removida, mas o chamado não foi reaberto para lançamento financeiro:",
        ticketError
      );
    }
  }

  revalidatePath("/admin/relatorios");
  revalidatePath("/admin/manutencao");
  redirect(buildReturnPath(context, { salvo: "movimentacao-excluida" }));
}

export async function postMaintenanceToFinancial(formData: FormData): Promise<void> {
  const context = getReturnContext(formData);
  const ticketId = getTextValue(formData, "ticketId");

  if (!ticketId || !context.propertyId) {
    redirect(buildReturnPath(context, { erro: "manutencao-lancar" }));
  }

  const { user, adminSupabase } = await requireAdmin();

  const { data: ticket, error: ticketError } = await adminSupabase
    .from("maintenance_tickets")
    .select("id, property_id, final_cost, status, charge_owner")
    .eq("id", ticketId)
    .maybeSingle();

  if (
    ticketError ||
    !ticket ||
    ticket.property_id !== context.propertyId ||
    ticket.status !== "Concluído" ||
    !ticket.charge_owner
  ) {
    console.error("Chamado não está apto para sincronização financeira:", ticketError);
    redirect(buildReturnPath(context, { erro: "manutencao-lancar" }));
  }

  const finalCost = Number(ticket.final_cost ?? 0);

  if (!Number.isFinite(finalCost) || finalCost <= 0) {
    redirect(buildReturnPath(context, { erro: "manutencao-sem-custo" }));
  }

  try {
    await syncMaintenanceFinancialEntry({
      ticketId,
      actorUserId: user.id,
      expectedPropertyId: context.propertyId,
    });
  } catch (error) {
    console.error("Erro ao sincronizar manutenção com o financeiro:", error);
    redirect(buildReturnPath(context, { erro: "manutencao-lancar" }));
  }

  revalidatePath("/admin/relatorios");
  revalidatePath("/admin/manutencao");
  revalidatePath(`/admin/manutencao/${ticketId}`);
  redirect(buildReturnPath(context, { salvo: "manutencao-lancada" }));
}

export async function createOwnerReportSnapshot(formData: FormData): Promise<void> {
  const context = getReturnContext(formData);
  const status = getTextValue(formData, "status") as ReportStatus;
  const notes = getTextValue(formData, "notes");

  if (
    !context.propertyId ||
    !isDateOnly(context.periodStart) ||
    !isDateOnly(context.periodEnd) ||
    context.periodEnd < context.periodStart ||
    !REPORT_STATUSES.includes(status)
  ) {
    redirect(buildReturnPath(context, { erro: "relatorio-periodo" }));
  }

  const { user, adminSupabase } = await requireAdmin();

  const { data: ownerLink, error: ownerLinkError } = await adminSupabase
    .from("property_owner_links")
    .select("owner_id")
    .eq("property_id", context.propertyId)
    .eq("is_primary", true)
    .maybeSingle();

  if (ownerLinkError || !ownerLink?.owner_id) {
    redirect(buildReturnPath(context, { erro: "relatorio-proprietario" }));
  }

  const { data: entries, error: entriesError } = await adminSupabase
    .from("property_financial_entries")
    .select("entry_type, amount, deduct_from_owner")
    .eq("property_id", context.propertyId)
    .gte("entry_date", context.periodStart)
    .lte("entry_date", context.periodEnd);

  if (entriesError) {
    console.error("Erro ao calcular relatório:", entriesError);
    redirect(buildReturnPath(context, { erro: "relatorio-salvar" }));
  }

  const grossRevenue = (entries ?? [])
    .filter((entry) => entry.entry_type === "revenue")
    .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);

  const deductibleExpenses = (entries ?? [])
    .filter(
      (entry) => entry.entry_type === "expense" && entry.deduct_from_owner
    )
    .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);

  const netOwnerAmount = grossRevenue - deductibleExpenses;
  const now = new Date().toISOString();

  const reportSnapshot = {
    property_id: context.propertyId,
    owner_id: ownerLink.owner_id,
    period_start: context.periodStart,
    period_end: context.periodEnd,
    status,
    gross_revenue: Math.round(grossRevenue * 100) / 100,
    deductible_expenses: Math.round(deductibleExpenses * 100) / 100,
    net_owner_amount: Math.round(netOwnerAmount * 100) / 100,
    notes: notes || null,
    generated_at: status === "draft" ? null : now,
    sent_at: status === "sent" ? now : null,
  };

  // Um mesmo imóvel/período deve ter apenas UMA prestação de contas.
  // A busca independe do status atual (rascunho, fechado ou enviado), para que
  // salvar novamente ou fechar o período atualize o mesmo registro. Se existirem
  // duplicidades antigas, o registro mais recente é preservado e os demais são
  // removidos após a atualização.
  const { data: existingReports, error: existingReportsError } =
    await adminSupabase
      .from("owner_reports")
      .select("id, status, created_at, updated_at")
      .eq("property_id", context.propertyId)
      .eq("period_start", context.periodStart)
      .eq("period_end", context.periodEnd)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false });

  if (existingReportsError) {
    console.error(
      "Erro ao localizar relatório existente do período:",
      existingReportsError
    );
    redirect(buildReturnPath(context, { erro: "relatorio-salvar" }));
  }

  const primaryReportId = existingReports?.[0]?.id ?? null;

  if (primaryReportId) {
    const { error } = await adminSupabase
      .from("owner_reports")
      .update(reportSnapshot)
      .eq("id", primaryReportId);

    if (error) {
      console.error("Erro ao atualizar relatório do proprietário:", error);
      redirect(buildReturnPath(context, { erro: "relatorio-salvar" }));
    }

    const duplicateIds = (existingReports ?? [])
      .slice(1)
      .map((report) => report.id);

    if (duplicateIds.length > 0) {
      const { error: cleanupError } = await adminSupabase
        .from("owner_reports")
        .delete()
        .in("id", duplicateIds);

      if (cleanupError) {
        console.error(
          "Relatório atualizado, mas não foi possível limpar duplicidades antigas:",
          cleanupError
        );
      }
    }
  } else {
    const { error } = await adminSupabase.from("owner_reports").insert({
      ...reportSnapshot,
      created_by: user.id,
    });

    if (error) {
      console.error("Erro ao salvar relatório do proprietário:", error);
      redirect(buildReturnPath(context, { erro: "relatorio-salvar" }));
    }
  }

  revalidatePath("/admin/relatorios");
  redirect(buildReturnPath(context, { salvo: status === "draft" ? "rascunho" : "relatorio" }));
}

export async function setOwnerReportStatus(formData: FormData): Promise<void> {
  const context = getReturnContext(formData);
  const reportId = getTextValue(formData, "reportId");
  const status = getTextValue(formData, "status") as ReportStatus;

  if (!reportId || !REPORT_STATUSES.includes(status)) {
    redirect(buildReturnPath(context, { erro: "relatorio-status" }));
  }

  const { adminSupabase } = await requireAdmin();
  const now = new Date().toISOString();

  const updates: Record<string, string | null> = {
    status,
  };

  if (status === "closed") {
    updates.generated_at = now;
    updates.sent_at = null;
  } else if (status === "sent") {
    updates.generated_at = now;
    updates.sent_at = now;
  } else {
    updates.sent_at = null;
  }

  const { error } = await adminSupabase
    .from("owner_reports")
    .update(updates)
    .eq("id", reportId);

  if (error) {
    console.error("Erro ao atualizar status do relatório:", error);
    redirect(buildReturnPath(context, { erro: "relatorio-status" }));
  }

  revalidatePath("/admin/relatorios");
  redirect(buildReturnPath(context, { salvo: "status-relatorio" }));
}
