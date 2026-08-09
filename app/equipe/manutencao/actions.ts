"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

const PRIORITIES = [
  "Baixa",
  "Média",
  "Alta",
  "Urgente",
] as const;

const STATUSES = [
  "Aberto",
  "Em andamento",
  "Aguardando peça",
  "Concluído",
  "Cancelado",
] as const;

type MaintenancePriority =
  (typeof PRIORITIES)[number];

type MaintenanceStatus =
  (typeof STATUSES)[number];

function getTextValue(
  formData: FormData,
  fieldName: string
): string {
  const value =
    formData.get(fieldName);

  return typeof value === "string"
    ? value.trim()
    : "";
}

function isPriority(
  value: string
): value is MaintenancePriority {
  return PRIORITIES.includes(
    value as MaintenancePriority
  );
}

function isStatus(
  value: string
): value is MaintenanceStatus {
  return STATUSES.includes(
    value as MaintenanceStatus
  );
}

function parseMoney(
  value: string
): number | null {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return null;
  }

  let normalized =
    trimmed
      .replace(/\s/g, "")
      .replace(/^R\$/i, "");

  if (normalized.includes(",")) {
    normalized =
      normalized
        .replace(/\./g, "")
        .replace(",", ".");
  }

  const parsed =
    Number(normalized);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return null;
  }

  return (
    Math.round(parsed * 100) /
    100
  );
}

function getTodayDateOnly(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function addDays(
  dateOnly: string,
  days: number
): string {
  const [
    year,
    month,
    day,
  ] = dateOnly
    .split("-")
    .map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  date.setUTCDate(
    date.getUTCDate() + days
  );

  return date
    .toISOString()
    .slice(0, 10);
}

function getDefaultDueDate(
  priority: MaintenancePriority
): string {
  const today =
    getTodayDateOnly();

  switch (priority) {
    case "Urgente":
      return today;
    case "Alta":
      return addDays(
        today,
        1
      );
    case "Média":
      return addDays(
        today,
        3
      );
    case "Baixa":
      return addDays(
        today,
        7
      );
  }
}

async function requireTeamUser() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/equipe/login");
  }

  const {
    data: profile,
    error,
  } = await supabase
    .from("management_users")
    .select(
      "user_id, full_name, role, active"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    error ||
    !profile?.active
  ) {
    await supabase.auth.signOut();

    redirect(
      "/equipe/login?erro=acesso"
    );
  }

  return {
    supabase,
    user,
    profile,
  };
}

export async function createTeamMaintenanceTicket(
  formData: FormData
): Promise<void> {
  const propertyId =
    getTextValue(
      formData,
      "propertyId"
    );

  const location =
    getTextValue(
      formData,
      "location"
    );

  const category =
    getTextValue(
      formData,
      "category"
    );

  const problem =
    getTextValue(
      formData,
      "problem"
    );

  const priorityValue =
    getTextValue(
      formData,
      "priority"
    );

  if (
    !propertyId ||
    !category ||
    !problem ||
    !isPriority(
      priorityValue
    )
  ) {
    redirect(
      "/equipe/manutencao?erro=campos"
    );
  }

  const {
    supabase,
    user,
  } = await requireTeamUser();

  const adminSupabase =
    createSupabaseAdminClient();

  const {
    data: property,
    error: propertyError,
  } = await adminSupabase
    .from("property_catalog")
    .select("id")
    .eq("id", propertyId)
    .maybeSingle();

  if (
    propertyError ||
    !property
  ) {
    redirect(
      "/equipe/manutencao?erro=imovel"
    );
  }

  const priority =
    priorityValue as MaintenancePriority;

  const {
    error,
  } = await supabase
    .from("maintenance_tickets")
    .insert({
      property_id: propertyId,
      location:
        location || null,
      category,
      problem,
      priority,
      assigned_to: user.id,
      status: "Aberto",
      due_date:
        getDefaultDueDate(
          priority
        ),
      created_by: user.id,
      updated_by: user.id,
    });

  if (error) {
    console.error(
      "Erro ao abrir chamado pela equipe:",
      error
    );

    redirect(
      "/equipe/manutencao?erro=salvar"
    );
  }

  revalidatePath(
    "/equipe/manutencao"
  );

  revalidatePath(
    "/admin/manutencao"
  );

  redirect(
    "/equipe/manutencao?criado=1"
  );
}

export async function addTeamMaintenanceUpdate(
  formData: FormData
): Promise<void> {
  const ticketId =
    getTextValue(
      formData,
      "ticketId"
    );

  const statusValue =
    getTextValue(
      formData,
      "status"
    );

  const comment =
    getTextValue(
      formData,
      "comment"
    );

  const finalCostValue =
    getTextValue(
      formData,
      "finalCost"
    );

  if (
    !ticketId ||
    !isStatus(statusValue) ||
    !comment
  ) {
    redirect(
      "/equipe/manutencao?erro=atualizacao"
    );
  }

  const finalCost =
    parseMoney(
      finalCostValue
    );

  if (
    finalCostValue &&
    finalCost === null
  ) {
    redirect(
      "/equipe/manutencao?erro=valor"
    );
  }

  const {
    supabase,
    user,
  } = await requireTeamUser();

  const {
    data: ticket,
    error: ticketError,
  } = await supabase
    .from("maintenance_tickets")
    .select(
      "id, status, completed_at"
    )
    .eq("id", ticketId)
    .maybeSingle();

  if (
    ticketError ||
    !ticket
  ) {
    redirect(
      "/equipe/manutencao?erro=chamado"
    );
  }

  const completedAt =
    statusValue === "Concluído"
      ? (
          ticket.completed_at ??
          new Date().toISOString()
        )
      : null;

  const updatePayload: {
    status: MaintenanceStatus;
    completed_at: string | null;
    updated_by: string;
    final_cost?: number;
  } = {
    status:
      statusValue as MaintenanceStatus,
    completed_at: completedAt,
    updated_by: user.id,
  };

  if (finalCost !== null) {
    updatePayload.final_cost =
      finalCost;
  }

  const {
    error: updateError,
  } = await supabase
    .from("maintenance_tickets")
    .update(updatePayload)
    .eq("id", ticketId);

  if (updateError) {
    console.error(
      "Erro ao atualizar chamado pela equipe:",
      updateError
    );

    redirect(
      "/equipe/manutencao?erro=atualizacao"
    );
  }

  const {
    error: historyError,
  } = await supabase
    .from("maintenance_updates")
    .insert({
      ticket_id: ticketId,
      status:
        statusValue as MaintenanceStatus,
      comment,
      created_by: user.id,
    });

  if (historyError) {
    console.error(
      "Erro ao registrar histórico da manutenção:",
      historyError
    );

    redirect(
      "/equipe/manutencao?erro=historico"
    );
  }

  revalidatePath(
    "/equipe/manutencao"
  );

  revalidatePath(
    "/admin/manutencao"
  );

  redirect(
    "/equipe/manutencao?salvo=1"
  );
}
