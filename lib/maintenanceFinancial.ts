import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

type SyncMaintenanceFinancialEntryOptions = {
  ticketId: string;
  actorUserId: string;
  expectedPropertyId?: string;
};

type SyncMaintenanceFinancialEntryResult = {
  state: "created" | "updated" | "removed" | "unchanged";
  posted: boolean;
  entryId: string | null;
  amount: number | null;
  reason: "not-completed" | "not-charge-owner" | "missing-cost" | null;
};

type MaintenanceTicketForFinancial = {
  id: string;
  ticket_number: string;
  property_id: string;
  problem: string;
  final_cost: number | string | null;
  completed_at: string | null;
  status: string;
  charge_owner: boolean;
};

type ExistingFinancialEntry = {
  id: string;
};

function getReason(
  ticket: MaintenanceTicketForFinancial,
  finalCost: number
): SyncMaintenanceFinancialEntryResult["reason"] {
  if (ticket.status !== "Concluído") {
    return "not-completed";
  }

  if (!ticket.charge_owner) {
    return "not-charge-owner";
  }

  if (!Number.isFinite(finalCost) || finalCost <= 0) {
    return "missing-cost";
  }

  return null;
}

export async function syncMaintenanceFinancialEntry({
  ticketId,
  actorUserId,
  expectedPropertyId,
}: SyncMaintenanceFinancialEntryOptions): Promise<SyncMaintenanceFinancialEntryResult> {
  const adminSupabase = createSupabaseAdminClient();

  const { data: ticketData, error: ticketError } = await adminSupabase
    .from("maintenance_tickets")
    .select(
      "id, ticket_number, property_id, problem, final_cost, completed_at, status, charge_owner"
    )
    .eq("id", ticketId)
    .maybeSingle();

  if (ticketError || !ticketData) {
    throw new Error(
      `Não foi possível localizar o chamado para sincronização financeira: ${
        ticketError?.message ?? ticketId
      }`
    );
  }

  const ticket = ticketData as MaintenanceTicketForFinancial;

  if (expectedPropertyId && ticket.property_id !== expectedPropertyId) {
    throw new Error("O chamado não pertence ao imóvel selecionado.");
  }

  const { data: existingData, error: existingError } = await adminSupabase
    .from("property_financial_entries")
    .select("id")
    .eq("maintenance_ticket_id", ticket.id)
    .order("created_at", { ascending: true });

  if (existingError) {
    throw new Error(
      `Não foi possível consultar o lançamento financeiro da manutenção: ${existingError.message}`
    );
  }

  const existingEntries = (existingData ?? []) as ExistingFinancialEntry[];
  const finalCost = Number(ticket.final_cost ?? 0);
  const reason = getReason(ticket, finalCost);

  if (reason) {
    if (existingEntries.length > 0) {
      const { error: deleteError } = await adminSupabase
        .from("property_financial_entries")
        .delete()
        .eq("maintenance_ticket_id", ticket.id);

      if (deleteError) {
        throw new Error(
          `Não foi possível remover o lançamento financeiro da manutenção: ${deleteError.message}`
        );
      }
    }

    const { error: ticketUpdateError } = await adminSupabase
      .from("maintenance_tickets")
      .update({
        posted_to_financial: false,
        updated_by: actorUserId,
      })
      .eq("id", ticket.id);

    if (ticketUpdateError) {
      throw new Error(
        `Não foi possível atualizar o indicador financeiro do chamado: ${ticketUpdateError.message}`
      );
    }

    return {
      state: existingEntries.length > 0 ? "removed" : "unchanged",
      posted: false,
      entryId: null,
      amount: null,
      reason,
    };
  }

  const entryDate = ticket.completed_at
    ? String(ticket.completed_at).slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const financialPayload = {
    property_id: ticket.property_id,
    entry_date: entryDate,
    entry_type: "expense",
    category: "Manutenção",
    channel: null,
    description: `${ticket.ticket_number} — ${ticket.problem}`,
    amount: Math.round(finalCost * 100) / 100,
    deduct_from_owner: true,
    reservation_reference: ticket.ticket_number,
    maintenance_ticket_id: ticket.id,
  };

  let entryId: string;
  let state: SyncMaintenanceFinancialEntryResult["state"];

  if (existingEntries.length > 0) {
    entryId = existingEntries[0].id;

    const { error: updateEntryError } = await adminSupabase
      .from("property_financial_entries")
      .update(financialPayload)
      .eq("id", entryId);

    if (updateEntryError) {
      throw new Error(
        `Não foi possível atualizar a despesa da manutenção: ${updateEntryError.message}`
      );
    }

    if (existingEntries.length > 1) {
      const duplicateIds = existingEntries.slice(1).map((entry) => entry.id);
      const { error: duplicateError } = await adminSupabase
        .from("property_financial_entries")
        .delete()
        .in("id", duplicateIds);

      if (duplicateError) {
        throw new Error(
          `Não foi possível remover lançamentos duplicados da manutenção: ${duplicateError.message}`
        );
      }
    }

    state = "updated";
  } else {
    const { data: insertedEntry, error: insertError } = await adminSupabase
      .from("property_financial_entries")
      .insert({
        ...financialPayload,
        created_by: actorUserId,
      })
      .select("id")
      .single();

    if (insertError || !insertedEntry?.id) {
      throw new Error(
        `Não foi possível criar a despesa da manutenção: ${
          insertError?.message ?? "lançamento não retornado"
        }`
      );
    }

    entryId = insertedEntry.id;
    state = "created";
  }

  const { error: ticketUpdateError } = await adminSupabase
    .from("maintenance_tickets")
    .update({
      posted_to_financial: true,
      updated_by: actorUserId,
    })
    .eq("id", ticket.id);

  if (ticketUpdateError) {
    throw new Error(
      `A despesa foi sincronizada, mas não foi possível atualizar o indicador do chamado: ${ticketUpdateError.message}`
    );
  }

  return {
    state,
    posted: true,
    entryId,
    amount: financialPayload.amount,
    reason: null,
  };
}
