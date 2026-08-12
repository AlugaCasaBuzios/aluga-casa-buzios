"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const paymentStatuses = [
  "pending",
  "paid",
  "overdue",
  "waived",
] as const;

const serviceStatuses = [
  "active",
  "suspended",
  "canceled",
] as const;

const billingCycles = [
  "one_time",
  "monthly",
  "annual",
] as const;

type PaymentStatus = (typeof paymentStatuses)[number];
type ServiceStatus = (typeof serviceStatuses)[number];
type BillingCycle = (typeof billingCycles)[number];

function getFormText(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value.trim() : "";
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizePhone(value: string): string | null {
  const normalized = value.replace(/\D/g, "").slice(0, 20);
  return normalized || null;
}

function normalizeEmail(value: string): string | null {
  const normalized = value.trim().toLowerCase().slice(0, 200);

  if (!normalized) {
    return null;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ? normalized
    : null;
}

function normalizeDate(value: string): string | null {
  if (!value) {
    return null;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function parseAmountInCents(value: string): number | null {
  if (!value) {
    return 0;
  }

  const parsed = Number(value.replace(",", "."));

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10_000_000) {
    return null;
  }

  return Math.round(parsed * 100);
}

function getPaymentStatus(value: string): PaymentStatus {
  return paymentStatuses.includes(value as PaymentStatus)
    ? (value as PaymentStatus)
    : "pending";
}

function getServiceStatus(value: string): ServiceStatus {
  return serviceStatuses.includes(value as ServiceStatus)
    ? (value as ServiceStatus)
    : "active";
}

function getBillingCycle(value: string): BillingCycle {
  return billingCycles.includes(value as BillingCycle)
    ? (value as BillingCycle)
    : "one_time";
}

function redirectWithMessage(path: string, key: "erro" | "salvo", message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}${key}=${encodeURIComponent(message)}`);
}

async function requireManagementAdmin() {
  const authenticationClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authenticationClient.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: isAdmin, error } = await authenticationClient.rpc(
    "is_management_admin"
  );

  if (error || isAdmin !== true) {
    redirect("/admin");
  }

  return user;
}

type ServiceInput = {
  tourId: string;
  amountCents: number;
  dueDate: string | null;
  paymentStatus: PaymentStatus;
  serviceStatus: ServiceStatus;
  billingCycle: BillingCycle;
  notes: string | null;
};

function readServiceInput(formData: FormData): ServiceInput | null {
  const tourId = getFormText(formData, "tour_id");
  const amountCents = parseAmountInCents(
    getFormText(formData, "amount")
  );

  if (!isValidUuid(tourId) || amountCents === null) {
    return null;
  }

  return {
    tourId,
    amountCents,
    dueDate: normalizeDate(getFormText(formData, "due_date")),
    paymentStatus: getPaymentStatus(
      getFormText(formData, "payment_status")
    ),
    serviceStatus: getServiceStatus(
      getFormText(formData, "service_status")
    ),
    billingCycle: getBillingCycle(
      getFormText(formData, "billing_cycle")
    ),
    notes: getFormText(formData, "service_notes").slice(0, 2000) || null,
  };
}

export async function createVirtualTourClient(formData: FormData) {
  const user = await requireManagementAdmin();
  const name = getFormText(formData, "name").slice(0, 150);
  const emailValue = getFormText(formData, "email");
  const email = normalizeEmail(emailValue);

  if (name.length < 2) {
    redirectWithMessage(
      "/admin/clientes-tours/novo",
      "erro",
      "Informe o nome do cliente."
    );
  }

  if (emailValue && !email) {
    redirectWithMessage(
      "/admin/clientes-tours/novo",
      "erro",
      "Informe um e-mail válido."
    );
  }

  const selectedTourId = getFormText(formData, "tour_id");
  const serviceInput = selectedTourId ? readServiceInput(formData) : null;

  if (selectedTourId && !serviceInput) {
    redirectWithMessage(
      "/admin/clientes-tours/novo",
      "erro",
      "Revise o passeio e o valor do serviço."
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: client, error: clientError } = await supabase
    .from("virtual_tour_clients")
    .insert({
      name,
      company_name:
        getFormText(formData, "company_name").slice(0, 150) || null,
      whatsapp: normalizePhone(getFormText(formData, "whatsapp")),
      phone: normalizePhone(getFormText(formData, "phone")),
      email,
      document: getFormText(formData, "document").slice(0, 40) || null,
      notes: getFormText(formData, "notes").slice(0, 3000) || null,
      active: true,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (clientError || !client) {
    console.error("Erro ao cadastrar cliente de tour:", clientError);
    redirectWithMessage(
      "/admin/clientes-tours/novo",
      "erro",
      "Não foi possível cadastrar o cliente."
    );
  }

  if (serviceInput) {
    const { error: serviceError } = await supabase
      .from("virtual_tour_services")
      .insert({
        client_id: client.id,
        tour_id: serviceInput.tourId,
        amount_cents: serviceInput.amountCents,
        due_date: serviceInput.dueDate,
        payment_status: serviceInput.paymentStatus,
        paid_at:
          serviceInput.paymentStatus === "paid"
            ? new Date().toISOString()
            : null,
        service_status: serviceInput.serviceStatus,
        billing_cycle: serviceInput.billingCycle,
        notes: serviceInput.notes,
      });

    if (serviceError) {
      await supabase.from("virtual_tour_clients").delete().eq("id", client.id);
      console.error("Erro ao cadastrar primeiro serviço do cliente:", serviceError);

      const message =
        serviceError.code === "23505"
          ? "Este passeio já está vinculado a outro cliente."
          : "Não foi possível vincular o passeio ao cliente.";

      redirectWithMessage("/admin/clientes-tours/novo", "erro", message);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/clientes-tours");
  revalidatePath("/admin/tours");
  redirect(`/admin/clientes-tours/${client.id}?criado=1`);
}

export async function updateVirtualTourClient(formData: FormData) {
  await requireManagementAdmin();
  const clientId = getFormText(formData, "client_id");
  const detailPath = `/admin/clientes-tours/${clientId}`;
  const name = getFormText(formData, "name").slice(0, 150);
  const emailValue = getFormText(formData, "email");
  const email = normalizeEmail(emailValue);

  if (!isValidUuid(clientId) || name.length < 2) {
    redirectWithMessage(detailPath, "erro", "Revise os dados do cliente.");
  }

  if (emailValue && !email) {
    redirectWithMessage(detailPath, "erro", "Informe um e-mail válido.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("virtual_tour_clients")
    .update({
      name,
      company_name:
        getFormText(formData, "company_name").slice(0, 150) || null,
      whatsapp: normalizePhone(getFormText(formData, "whatsapp")),
      phone: normalizePhone(getFormText(formData, "phone")),
      email,
      document: getFormText(formData, "document").slice(0, 40) || null,
      notes: getFormText(formData, "notes").slice(0, 3000) || null,
      active: formData.get("active") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);

  if (error) {
    console.error("Erro ao atualizar cliente de tour:", error);
    redirectWithMessage(detailPath, "erro", "Não foi possível atualizar o cliente.");
  }

  revalidatePath("/admin/clientes-tours");
  revalidatePath(detailPath);
  redirectWithMessage(detailPath, "salvo", "Dados do cliente atualizados.");
}

export async function createVirtualTourService(formData: FormData) {
  await requireManagementAdmin();
  const clientId = getFormText(formData, "client_id");
  const detailPath = `/admin/clientes-tours/${clientId}`;
  const input = readServiceInput(formData);

  if (!isValidUuid(clientId) || !input) {
    redirectWithMessage(detailPath, "erro", "Revise os dados do novo serviço.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("virtual_tour_services").insert({
    client_id: clientId,
    tour_id: input.tourId,
    amount_cents: input.amountCents,
    due_date: input.dueDate,
    payment_status: input.paymentStatus,
    paid_at: input.paymentStatus === "paid" ? new Date().toISOString() : null,
    service_status: input.serviceStatus,
    billing_cycle: input.billingCycle,
    notes: input.notes,
  });

  if (error) {
    console.error("Erro ao vincular serviço ao cliente:", error);
    const message =
      error.code === "23505"
        ? "Este passeio já está vinculado a outro cliente."
        : "Não foi possível cadastrar o serviço.";
    redirectWithMessage(detailPath, "erro", message);
  }

  revalidatePath("/admin/clientes-tours");
  revalidatePath("/admin/tours");
  revalidatePath(detailPath);
  redirectWithMessage(detailPath, "salvo", "Serviço vinculado com sucesso.");
}

export async function updateVirtualTourService(formData: FormData) {
  await requireManagementAdmin();
  const clientId = getFormText(formData, "client_id");
  const serviceId = getFormText(formData, "service_id");
  const detailPath = `/admin/clientes-tours/${clientId}`;
  const amountCents = parseAmountInCents(getFormText(formData, "amount"));

  if (!isValidUuid(clientId) || !isValidUuid(serviceId) || amountCents === null) {
    redirectWithMessage(detailPath, "erro", "Revise os dados do serviço.");
  }

  const paymentStatus = getPaymentStatus(
    getFormText(formData, "payment_status")
  );
  const supabase = createSupabaseAdminClient();
  const { data: currentService, error: currentError } = await supabase
    .from("virtual_tour_services")
    .select("paid_at")
    .eq("id", serviceId)
    .eq("client_id", clientId)
    .single();

  if (currentError || !currentService) {
    redirectWithMessage(detailPath, "erro", "Serviço não encontrado.");
  }

  const { error } = await supabase
    .from("virtual_tour_services")
    .update({
      amount_cents: amountCents,
      due_date: normalizeDate(getFormText(formData, "due_date")),
      payment_status: paymentStatus,
      paid_at:
        paymentStatus === "paid"
          ? currentService.paid_at || new Date().toISOString()
          : null,
      service_status: getServiceStatus(
        getFormText(formData, "service_status")
      ),
      billing_cycle: getBillingCycle(
        getFormText(formData, "billing_cycle")
      ),
      notes:
        getFormText(formData, "service_notes").slice(0, 2000) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId)
    .eq("client_id", clientId);

  if (error) {
    console.error("Erro ao atualizar serviço do tour:", error);
    redirectWithMessage(detailPath, "erro", "Não foi possível atualizar o serviço.");
  }

  revalidatePath("/admin/clientes-tours");
  revalidatePath(detailPath);
  redirectWithMessage(detailPath, "salvo", "Serviço atualizado com sucesso.");
}
