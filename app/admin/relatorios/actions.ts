"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { syncMaintenanceFinancialEntry } from "@/lib/maintenanceFinancial";
import {
  calculateOwnerReportFinancial,
  isServicePlan,
  resolveCommissionPercentage,
} from "@/lib/ownerReportFinancial";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const REPORT_STATUSES = ["draft", "closed", "sent"] as const;

const FINANCIAL_ENTRY_FILES_BUCKET =
  "financial-entry-files";

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

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
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

async function synchronizeReportPaymentStatus(
  adminSupabase: ReturnType<typeof createSupabaseAdminClient>,
  reportId: string
): Promise<void> {
  const { data: report, error: reportError } = await adminSupabase
    .from("owner_reports")
    .select("amount_due_to_manager, status")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError || !report) {
    throw new Error("Não foi possível localizar o relatório.");
  }

  const { data: payments, error: paymentsError } = await adminSupabase
    .from("owner_report_payments")
    .select("amount")
    .eq("report_id", reportId);

  if (paymentsError) {
    throw new Error("Não foi possível calcular os pagamentos do relatório.");
  }

  const amountDue = Number(report.amount_due_to_manager ?? 0);
  const amountPaid = (payments ?? []).reduce(
    (total, payment) => total + Number(payment.amount ?? 0),
    0
  );

  let paymentStatus: "not_due" | "pending" | "partial" | "paid";

  if (report.status === "draft" || amountDue <= 0) {
    paymentStatus = "not_due";
  } else if (amountPaid <= 0) {
    paymentStatus = "pending";
  } else if (amountPaid + 0.005 >= amountDue) {
    paymentStatus = "paid";
  } else {
    paymentStatus = "partial";
  }

  const { error: updateError } = await adminSupabase
    .from("owner_reports")
    .update({
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (updateError) {
    throw new Error("Não foi possível atualizar o status do pagamento.");
  }
}

export async function savePropertyOwner(formData: FormData): Promise<void> {
  const context = getReturnContext(formData);
  const ownerId = getTextValue(formData, "ownerId");
  const fullName = getTextValue(formData, "fullName");
  const email = getTextValue(formData, "email");
  const phone = getTextValue(formData, "phone");
  const whatsapp = getTextValue(formData, "whatsapp");
  const notes = getTextValue(formData, "notes");
  const servicePlan = getTextValue(formData, "servicePlan");
  const commissionPercentageInput = parseMoney(
    getTextValue(formData, "commissionPercentage")
  );
  const contractStartDate = getTextValue(formData, "contractStartDate");
  const contractNotes = getTextValue(formData, "contractNotes");

  if (
    !context.propertyId ||
    !fullName ||
    !isServicePlan(servicePlan) ||
    (servicePlan === "custom" && commissionPercentageInput === null) ||
    (contractStartDate && !isDateOnly(contractStartDate))
  ) {
    redirect(buildReturnPath(context, { erro: "proprietario-campos" }));
  }

  const commissionPercentage = resolveCommissionPercentage(
    servicePlan,
    commissionPercentageInput
  );

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
      service_plan: servicePlan,
      commission_percentage: commissionPercentage,
      contract_start_date: contractStartDate || null,
      contract_notes: contractNotes || null,
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
      entry_source: "manual",
      receipt_status: entryType === "expense" ? "pending" : "not_required",
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

  const {
    data: attachmentRows,
    error: attachmentsError,
  } = await adminSupabase
    .from(
      "property_financial_entry_attachments"
    )
    .select("storage_path")
    .eq("financial_entry_id", entryId);

  if (attachmentsError) {
    console.error(
      "Erro ao localizar documentos da movimentação:",
      attachmentsError
    );
  }

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

  const attachmentPaths =
    (attachmentRows ?? [])
      .map(
        (attachment) =>
          attachment.storage_path
      )
      .filter(
        (path): path is string =>
          typeof path === "string" &&
          path !== ""
      );

  if (
    attachmentPaths.length > 0
  ) {
    const {
      error: storageError,
    } = await adminSupabase.storage
      .from(
        FINANCIAL_ENTRY_FILES_BUCKET
      )
      .remove(attachmentPaths);

    if (storageError) {
      console.error(
        "Movimentação excluída, mas alguns documentos permaneceram no armazenamento:",
        storageError
      );
    }
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

export async function deleteFinancialEntryAttachment(
  formData: FormData
): Promise<void> {
  const context =
    getReturnContext(formData);

  const attachmentId =
    getTextValue(
      formData,
      "attachmentId"
    );

  if (
    !isValidUuid(attachmentId) ||
    !context.propertyId
  ) {
    redirect(
      buildReturnPath(context, {
        erro: "documento-excluir",
      })
    );
  }

  const { adminSupabase } =
    await requireAdmin();

  const {
    data: attachment,
    error: attachmentError,
  } = await adminSupabase
    .from(
      "property_financial_entry_attachments"
    )
    .select(`
      id,
      financial_entry_id,
      storage_bucket,
      storage_path
    `)
    .eq("id", attachmentId)
    .maybeSingle();

  if (
    attachmentError ||
    !attachment
  ) {
    console.error(
      "Erro ao localizar documento financeiro:",
      attachmentError
    );

    redirect(
      buildReturnPath(context, {
        erro: "documento-excluir",
      })
    );
  }

  const {
    data: financialEntry,
    error: entryError,
  } = await adminSupabase
    .from(
      "property_financial_entries"
    )
    .select(
      "id, property_id, entry_type"
    )
    .eq(
      "id",
      attachment.financial_entry_id
    )
    .maybeSingle();

  if (
    entryError ||
    !financialEntry ||
    financialEntry.property_id !==
      context.propertyId
  ) {
    console.error(
      "Documento não pertence ao imóvel selecionado:",
      entryError
    );

    redirect(
      buildReturnPath(context, {
        erro: "documento-excluir",
      })
    );
  }

  const {
    error: storageError,
  } = await adminSupabase.storage
    .from(
      attachment.storage_bucket ||
        FINANCIAL_ENTRY_FILES_BUCKET
    )
    .remove([
      attachment.storage_path,
    ]);

  if (storageError) {
    console.error(
      "Erro ao excluir arquivo financeiro:",
      storageError
    );

    redirect(
      buildReturnPath(context, {
        erro: "documento-excluir",
      })
    );
  }

  const {
    error: deleteError,
  } = await adminSupabase
    .from(
      "property_financial_entry_attachments"
    )
    .delete()
    .eq("id", attachmentId);

  if (deleteError) {
    console.error(
      "Erro ao excluir registro do documento financeiro:",
      deleteError
    );

    redirect(
      buildReturnPath(context, {
        erro: "documento-excluir",
      })
    );
  }

  if (
    financialEntry.entry_type ===
    "expense"
  ) {
    const {
      count,
      error: countError,
    } = await adminSupabase
      .from(
        "property_financial_entry_attachments"
      )
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "financial_entry_id",
        financialEntry.id
      );

    if (!countError) {
      await adminSupabase
        .from(
          "property_financial_entries"
        )
        .update({
          receipt_status:
            (count ?? 0) > 0
              ? "received"
              : "pending",
        })
        .eq("id", financialEntry.id);
    }
  }

  revalidatePath(
    "/admin/relatorios"
  );
  revalidatePath(
    "/admin/relatorios/pdf"
  );

  redirect(
    buildReturnPath(context, {
      salvo: "documento-excluido",
    })
  );
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
    .select("owner_id, service_plan, commission_percentage")
    .eq("property_id", context.propertyId)
    .eq("is_primary", true)
    .maybeSingle();

  if (ownerLinkError || !ownerLink?.owner_id) {
    redirect(buildReturnPath(context, { erro: "relatorio-proprietario" }));
  }

  const { data: entries, error: entriesError } = await adminSupabase
    .from("property_financial_entries")
    .select("entry_type, category, amount, deduct_from_owner")
    .eq("property_id", context.propertyId)
    .gte("entry_date", context.periodStart)
    .lte("entry_date", context.periodEnd);

  if (entriesError) {
    console.error("Erro ao calcular relatório:", entriesError);
    redirect(buildReturnPath(context, { erro: "relatorio-salvar" }));
  }

  const servicePlan = isServicePlan(ownerLink.service_plan)
    ? ownerLink.service_plan
    : "custom";

  const commissionPercentage = resolveCommissionPercentage(
    servicePlan,
    ownerLink.commission_percentage
  );

  const financial = calculateOwnerReportFinancial(
    entries ?? [],
    commissionPercentage
  );
  const now = new Date().toISOString();

  const baseReportSnapshot = {
    property_id: context.propertyId,
    owner_id: ownerLink.owner_id,
    period_start: context.periodStart,
    period_end: context.periodEnd,
    status,
    service_plan: servicePlan,
    commission_percentage: financial.commissionPercentage,
    gross_revenue: financial.grossRevenue,
    cleaning_total: financial.cleaningTotal,
    commission_base: financial.commissionBase,
    commission_amount: financial.commissionAmount,
    deductible_expenses: financial.reimbursableExpenses,
    reimbursable_expenses: financial.reimbursableExpenses,
    amount_due_to_manager: financial.amountDueToManager,
    net_owner_amount: financial.netOwnerAmount,
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
      .select("id, status, payment_status, created_at, updated_at")
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
  const paymentStatus =
    financial.amountDueToManager <= 0 || status === "draft"
      ? "not_due"
      : "pending";

  const reportSnapshot = {
    ...baseReportSnapshot,
    payment_status: paymentStatus,
  };

  let savedReportId = primaryReportId;

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
    const { data: insertedReport, error } = await adminSupabase
      .from("owner_reports")
      .insert({
        ...reportSnapshot,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !insertedReport) {
      console.error("Erro ao salvar relatório do proprietário:", error);
      redirect(buildReturnPath(context, { erro: "relatorio-salvar" }));
    }

    savedReportId = insertedReport.id;
  }

  if (savedReportId) {
    try {
      await synchronizeReportPaymentStatus(adminSupabase, savedReportId);
    } catch (error) {
      console.error("Erro ao sincronizar pagamentos do relatório:", error);
      redirect(buildReturnPath(context, { erro: "pagamento-status" }));
    }
  }

  revalidatePath("/admin/relatorios");
  redirect(buildReturnPath(context, { salvo: status === "draft" ? "rascunho" : "relatorio" }));
}

export async function setOwnerReportStatus(formData: FormData): Promise<void> {
  const context = getReturnContext(formData);
  const reportId = getTextValue(formData, "reportId");
  const status = getTextValue(formData, "status") as ReportStatus;

  if (!isValidUuid(reportId) || !REPORT_STATUSES.includes(status)) {
    redirect(buildReturnPath(context, { erro: "relatorio-status" }));
  }

  const { adminSupabase } = await requireAdmin();
  const now = new Date().toISOString();

  const { data: currentReport, error: currentReportError } = await adminSupabase
    .from("owner_reports")
    .select("id")
    .eq("id", reportId)
    .maybeSingle();

  if (currentReportError || !currentReport) {
    console.error(
      "Erro ao localizar relatório antes de atualizar o status:",
      currentReportError
    );
    redirect(buildReturnPath(context, { erro: "relatorio-status" }));
  }

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

  try {
    await synchronizeReportPaymentStatus(adminSupabase, reportId);
  } catch (syncError) {
    console.error("Erro ao sincronizar status do pagamento:", syncError);
    redirect(buildReturnPath(context, { erro: "pagamento-status" }));
  }

  revalidatePath("/admin/relatorios");
  redirect(buildReturnPath(context, { salvo: "status-relatorio" }));
}

export async function createOwnerReportPayment(
  formData: FormData
): Promise<void> {
  const context = getReturnContext(formData);
  const reportId = getTextValue(formData, "reportId");
  const paymentDate = getTextValue(formData, "paymentDate");
  const amount = parseMoney(getTextValue(formData, "amount"));
  const paymentMethod = getTextValue(formData, "paymentMethod").slice(0, 80);
  const paymentReference = getTextValue(formData, "paymentReference").slice(
    0,
    180
  );
  const notes = getTextValue(formData, "paymentNotes").slice(0, 1000);

  if (
    !isValidUuid(reportId) ||
    !isDateOnly(paymentDate) ||
    amount === null ||
    amount <= 0
  ) {
    redirect(buildReturnPath(context, { erro: "pagamento-campos" }));
  }

  const { user, adminSupabase } = await requireAdmin();

  const { data: report, error: reportError } = await adminSupabase
    .from("owner_reports")
    .select("id, property_id, status, amount_due_to_manager")
    .eq("id", reportId)
    .eq("property_id", context.propertyId)
    .maybeSingle();

  if (reportError || !report || report.status === "draft") {
    console.error("Erro ao localizar relatório para pagamento:", reportError);
    redirect(buildReturnPath(context, { erro: "pagamento-relatorio" }));
  }

  const { data: existingPayments, error: paymentsError } = await adminSupabase
    .from("owner_report_payments")
    .select("amount")
    .eq("report_id", reportId);

  if (paymentsError) {
    console.error("Erro ao consultar pagamentos existentes:", paymentsError);
    redirect(buildReturnPath(context, { erro: "pagamento-salvar" }));
  }

  const amountDue = Number(report.amount_due_to_manager ?? 0);
  const amountAlreadyPaid = (existingPayments ?? []).reduce(
    (total, payment) => total + Number(payment.amount ?? 0),
    0
  );
  const remainingAmount = Math.max(0, amountDue - amountAlreadyPaid);

  if (amountDue <= 0 || amount > remainingAmount + 0.005) {
    redirect(buildReturnPath(context, { erro: "pagamento-excede" }));
  }

  const { error: insertError } = await adminSupabase
    .from("owner_report_payments")
    .insert({
      report_id: reportId,
      payment_date: paymentDate,
      amount,
      payment_method: paymentMethod || null,
      payment_reference: paymentReference || null,
      notes: notes || null,
      created_by: user.id,
    });

  if (insertError) {
    console.error("Erro ao registrar pagamento:", insertError);
    redirect(buildReturnPath(context, { erro: "pagamento-salvar" }));
  }

  try {
    await synchronizeReportPaymentStatus(adminSupabase, reportId);
  } catch (error) {
    console.error("Erro ao sincronizar status do pagamento:", error);
    redirect(buildReturnPath(context, { erro: "pagamento-status" }));
  }

  revalidatePath("/admin/relatorios");
  revalidatePath("/admin/relatorios/pdf");
  redirect(buildReturnPath(context, { salvo: "pagamento" }));
}

export async function deleteOwnerReportPayment(
  formData: FormData
): Promise<void> {
  const context = getReturnContext(formData);
  const reportId = getTextValue(formData, "reportId");
  const paymentId = getTextValue(formData, "paymentId");

  if (!isValidUuid(reportId) || !isValidUuid(paymentId)) {
    redirect(buildReturnPath(context, { erro: "pagamento-excluir" }));
  }

  const { adminSupabase } = await requireAdmin();

  const { data: payment, error: paymentError } = await adminSupabase
    .from("owner_report_payments")
    .select("id, report_id, attachment_path")
    .eq("id", paymentId)
    .eq("report_id", reportId)
    .maybeSingle();

  if (paymentError || !payment) {
    console.error("Erro ao localizar pagamento para exclusão:", paymentError);
    redirect(buildReturnPath(context, { erro: "pagamento-excluir" }));
  }

  const { error: deleteError } = await adminSupabase
    .from("owner_report_payments")
    .delete()
    .eq("id", paymentId)
    .eq("report_id", reportId);

  if (deleteError) {
    console.error("Erro ao excluir pagamento:", deleteError);
    redirect(buildReturnPath(context, { erro: "pagamento-excluir" }));
  }

  if (payment.attachment_path) {
    const { error: storageError } =
      await adminSupabase.storage
        .from(
          FINANCIAL_ENTRY_FILES_BUCKET
        )
        .remove([
          payment.attachment_path,
        ]);

    if (storageError) {
      console.error(
        "Pagamento excluído, mas o comprovante permaneceu no armazenamento:",
        storageError
      );
    }
  }

  try {
    await synchronizeReportPaymentStatus(adminSupabase, reportId);
  } catch (error) {
    console.error("Erro ao sincronizar status após exclusão:", error);
    redirect(buildReturnPath(context, { erro: "pagamento-status" }));
  }

  revalidatePath("/admin/relatorios");
  revalidatePath("/admin/relatorios/pdf");
  redirect(buildReturnPath(context, { salvo: "pagamento-excluido" }));
}

export async function deleteOwnerReportPaymentAttachment(
  formData: FormData
): Promise<void> {
  const context =
    getReturnContext(formData);

  const reportId = getTextValue(
    formData,
    "reportId"
  );

  const paymentId = getTextValue(
    formData,
    "paymentId"
  );

  if (
    !isValidUuid(reportId) ||
    !isValidUuid(paymentId) ||
    !context.propertyId
  ) {
    redirect(
      buildReturnPath(context, {
        erro:
          "comprovante-pagamento-excluir",
      })
    );
  }

  const { adminSupabase } =
    await requireAdmin();

  const {
    data: report,
    error: reportError,
  } = await adminSupabase
    .from("owner_reports")
    .select("id")
    .eq("id", reportId)
    .eq(
      "property_id",
      context.propertyId
    )
    .maybeSingle();

  if (reportError || !report) {
    console.error(
      "Erro ao validar relatório do comprovante:",
      reportError
    );

    redirect(
      buildReturnPath(context, {
        erro:
          "comprovante-pagamento-excluir",
      })
    );
  }

  const {
    data: payment,
    error: paymentError,
  } = await adminSupabase
    .from("owner_report_payments")
    .select(
      "id, report_id, attachment_path"
    )
    .eq("id", paymentId)
    .eq("report_id", reportId)
    .maybeSingle();

  if (
    paymentError ||
    !payment ||
    !payment.attachment_path
  ) {
    console.error(
      "Erro ao localizar comprovante do pagamento:",
      paymentError
    );

    redirect(
      buildReturnPath(context, {
        erro:
          "comprovante-pagamento-excluir",
      })
    );
  }

  const attachmentPath =
    payment.attachment_path;

  const { error: updateError } =
    await adminSupabase
      .from("owner_report_payments")
      .update({
        attachment_path: null,
      })
      .eq("id", paymentId)
      .eq("report_id", reportId);

  if (updateError) {
    console.error(
      "Erro ao remover comprovante do pagamento:",
      updateError
    );

    redirect(
      buildReturnPath(context, {
        erro:
          "comprovante-pagamento-excluir",
      })
    );
  }

  const { error: storageError } =
    await adminSupabase.storage
      .from(
        FINANCIAL_ENTRY_FILES_BUCKET
      )
      .remove([attachmentPath]);

  if (storageError) {
    console.error(
      "Comprovante desvinculado, mas o arquivo permaneceu no armazenamento:",
      storageError
    );
  }

  revalidatePath(
    "/admin/relatorios"
  );
  revalidatePath(
    "/admin/relatorios/pdf"
  );

  redirect(
    buildReturnPath(context, {
      salvo:
        "comprovante-pagamento-excluido",
    })
  );
}
