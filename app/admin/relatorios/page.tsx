import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

import {
  createFinancialEntry,
  createOwnerReportSnapshot,
  deleteFinancialEntry,
  postMaintenanceToFinancial,
  savePropertyOwner,
  setOwnerReportStatus,
} from "./actions";

export const dynamic = "force-dynamic";

type ReportsPageProps = {
  searchParams: Promise<{
    imovel?: string;
    inicio?: string;
    fim?: string;
    salvo?: string;
    erro?: string;
  }>;
};

type PropertyRow = {
  id: string;
  title: string;
  active: boolean;
  display_order: number;
};

type OwnerRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  notes: string | null;
};

type FinancialEntry = {
  id: string;
  entry_date: string;
  entry_type: "revenue" | "expense";
  category: string;
  channel: string | null;
  description: string;
  amount: number | string;
  deduct_from_owner: boolean;
  reservation_reference: string | null;
  maintenance_ticket_id: string | null;
};

type PendingMaintenance = {
  id: string;
  ticket_number: string;
  category: string;
  problem: string;
  final_cost: number | string | null;
  completed_at: string | null;
};

type OwnerReport = {
  id: string;
  period_start: string;
  period_end: string;
  status: "draft" | "closed" | "sent";
  gross_revenue: number | string;
  deductible_expenses: number | string;
  net_owner_amount: number | string;
  notes: string | null;
  generated_at: string | null;
  sent_at: string | null;
  created_at: string;
};

function isDateOnly(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
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

function getDefaultPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  const toDateOnly = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  return {
    start: toDateOnly(start),
    end: toDateOnly(end),
  };
}

function formatCurrency(value: number | string | null | undefined): string {
  const numericValue = Number(value ?? 0);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const dateOnly = value.slice(0, 10);
  const [year, month, day] = dateOnly.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusLabel(status: OwnerReport["status"]): string {
  switch (status) {
    case "draft":
      return "Rascunho";
    case "closed":
      return "Fechado";
    case "sent":
      return "Enviado";
  }
}

function getStatusClass(status: OwnerReport["status"]): string {
  switch (status) {
    case "draft":
      return "bg-amber-100 text-amber-900";
    case "closed":
      return "bg-blue-100 text-blue-900";
    case "sent":
      return "bg-emerald-100 text-emerald-900";
  }
}

function getFeedbackMessage(salvo?: string): string | null {
  switch (salvo) {
    case "proprietario":
      return "Proprietário salvo e vinculado ao imóvel.";
    case "movimentacao":
      return "Movimentação financeira cadastrada.";
    case "movimentacao-excluida":
      return "Movimentação financeira excluída.";
    case "manutencao-lancada":
      return "Manutenção sincronizada com as despesas do proprietário.";
    case "rascunho":
      return "Rascunho do relatório salvo no histórico.";
    case "relatorio":
      return "Relatório fechado e salvo no histórico.";
    case "status-relatorio":
      return "Status do relatório atualizado.";
    default:
      return null;
  }
}

function getErrorMessage(erro?: string): string | null {
  switch (erro) {
    case "proprietario-campos":
      return "Informe pelo menos o nome do proprietário.";
    case "proprietario-salvar":
    case "proprietario-vinculo":
      return "Não foi possível salvar o proprietário. Tente novamente.";
    case "movimentacao-campos":
      return "Revise os campos obrigatórios da movimentação.";
    case "movimentacao-salvar":
      return "Não foi possível cadastrar a movimentação.";
    case "movimentacao-excluir":
      return "Não foi possível excluir a movimentação.";
    case "manutencao-sem-custo":
      return "Informe o custo final no chamado antes de lançá-lo nas despesas.";
    case "manutencao-lancar":
      return "Não foi possível sincronizar essa manutenção com as despesas.";
    case "relatorio-periodo":
      return "Revise o período do relatório.";
    case "relatorio-proprietario":
      return "Cadastre e vincule o proprietário antes de salvar o relatório.";
    case "relatorio-salvar":
      return "Não foi possível salvar o relatório.";
    case "relatorio-status":
      return "Não foi possível atualizar o status do relatório.";
    default:
      return null;
  }
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("management_users")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile?.active || profile.role !== "admin") {
    redirect("/equipe/manutencao");
  }

  const adminSupabase = createSupabaseAdminClient();

  const { data: propertiesData, error: propertiesError } = await adminSupabase
    .from("property_catalog")
    .select("id, title, active, display_order")
    .order("display_order", { ascending: true })
    .order("title", { ascending: true });

  if (propertiesError) {
    console.error("Erro ao carregar imóveis para relatórios:", propertiesError);
  }

  const properties = (propertiesData ?? []) as PropertyRow[];
  const requestedProperty = params.imovel;
  const selectedProperty =
    properties.find((property) => property.id === requestedProperty) ??
    properties[0] ??
    null;

  const defaultPeriod = getDefaultPeriod();
  const periodStart = isDateOnly(params.inicio) ? params.inicio : defaultPeriod.start;
  const periodEnd = isDateOnly(params.fim) ? params.fim : defaultPeriod.end;

  let owner: OwnerRow | null = null;
  let entries: FinancialEntry[] = [];
  let pendingMaintenance: PendingMaintenance[] = [];
  let reports: OwnerReport[] = [];
  let loadError: string | null = null;

  if (selectedProperty) {
    const [ownerLinkResult, entriesResult, maintenanceResult, reportsResult] =
      await Promise.all([
        adminSupabase
          .from("property_owner_links")
          .select("owner_id")
          .eq("property_id", selectedProperty.id)
          .eq("is_primary", true)
          .limit(1)
          .maybeSingle(),
        adminSupabase
          .from("property_financial_entries")
          .select(`
            id,
            entry_date,
            entry_type,
            category,
            channel,
            description,
            amount,
            deduct_from_owner,
            reservation_reference,
            maintenance_ticket_id
          `)
          .eq("property_id", selectedProperty.id)
          .gte("entry_date", periodStart)
          .lte("entry_date", periodEnd)
          .order("entry_date", { ascending: false })
          .order("created_at", { ascending: false }),
        adminSupabase
          .from("maintenance_tickets")
          .select(`
            id,
            ticket_number,
            category,
            problem,
            final_cost,
            completed_at
          `)
          .eq("property_id", selectedProperty.id)
          .eq("status", "Concluído")
          .eq("charge_owner", true)
          .eq("posted_to_financial", false)
          .gte("completed_at", `${periodStart}T00:00:00`)
          .lte("completed_at", `${periodEnd}T23:59:59.999`)
          .order("completed_at", { ascending: false }),
        adminSupabase
          .from("owner_reports")
          .select(`
            id,
            period_start,
            period_end,
            status,
            gross_revenue,
            deductible_expenses,
            net_owner_amount,
            notes,
            generated_at,
            sent_at,
            created_at
          `)
          .eq("property_id", selectedProperty.id)
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

    if (ownerLinkResult.error) {
      console.error("Erro ao carregar vínculo do proprietário:", ownerLinkResult.error);
      loadError = "Não foi possível carregar o vínculo do proprietário.";
    }

    if (entriesResult.error) {
      console.error("Erro ao carregar movimentações:", entriesResult.error);
      loadError = "Não foi possível carregar as movimentações financeiras.";
    } else {
      entries = (entriesResult.data ?? []) as FinancialEntry[];
    }

    if (maintenanceResult.error) {
      console.error("Erro ao carregar manutenções pendentes:", maintenanceResult.error);
      loadError = "Não foi possível carregar as manutenções pendentes.";
    } else {
      pendingMaintenance = (maintenanceResult.data ?? []) as PendingMaintenance[];
    }

    if (reportsResult.error) {
      console.error("Erro ao carregar histórico de relatórios:", reportsResult.error);
      loadError = "Não foi possível carregar o histórico de relatórios.";
    } else {
      reports = (reportsResult.data ?? []) as OwnerReport[];
    }

    if (ownerLinkResult.data?.owner_id) {
      const { data: ownerData, error: ownerError } = await adminSupabase
        .from("property_owners")
        .select("id, full_name, email, phone, whatsapp, notes")
        .eq("id", ownerLinkResult.data.owner_id)
        .maybeSingle();

      if (ownerError) {
        console.error("Erro ao carregar proprietário:", ownerError);
        loadError = "Não foi possível carregar os dados do proprietário.";
      } else {
        owner = ownerData as OwnerRow | null;
      }
    }
  }

  const grossRevenue = entries
    .filter((entry) => entry.entry_type === "revenue")
    .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);

  const deductibleExpenses = entries
    .filter(
      (entry) => entry.entry_type === "expense" && entry.deduct_from_owner
    )
    .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);

  const nonDeductibleExpenses = entries
    .filter(
      (entry) => entry.entry_type === "expense" && !entry.deduct_from_owner
    )
    .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);

  const netOwnerAmount = grossRevenue - deductibleExpenses;

  const pendingMaintenanceTotal = pendingMaintenance.reduce(
    (sum, ticket) => sum + Number(ticket.final_cost ?? 0),
    0
  );

  const projectedNetOwnerAmount = netOwnerAmount - pendingMaintenanceTotal;
  const revenueEntries = entries.filter((entry) => entry.entry_type === "revenue");

  const revenueByChannel = new Map<string, number>();
  for (const entry of revenueEntries) {
    const channel = entry.channel || "Canal não informado";
    revenueByChannel.set(
      channel,
      (revenueByChannel.get(channel) ?? 0) + Number(entry.amount ?? 0)
    );
  }

  const expenseByCategory = new Map<string, number>();
  for (const entry of entries.filter((item) => item.entry_type === "expense")) {
    expenseByCategory.set(
      entry.category,
      (expenseByCategory.get(entry.category) ?? 0) + Number(entry.amount ?? 0)
    );
  }

  const feedbackMessage = getFeedbackMessage(params.salvo);
  const errorMessage = getErrorMessage(params.erro);

  const commonHiddenFields = selectedProperty ? (
    <>
      <input type="hidden" name="propertyId" value={selectedProperty.id} />
      <input type="hidden" name="periodStart" value={periodStart} />
      <input type="hidden" name="periodEnd" value={periodEnd} />
    </>
  ) : null;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-blue-950 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                Aluga Casa Búzios
              </p>
              <h1 className="mt-2 text-3xl font-bold">Relatórios para proprietários</h1>
              <p className="mt-2 max-w-3xl text-blue-100">
                Centralize receitas, despesas, manutenção e prestação de contas de cada imóvel.
              </p>
            </div>

            <Link
              href="/admin"
              style={{ color: "#172554" }}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 font-bold text-blue-950 transition hover:bg-blue-100"
            >
              Voltar ao painel
            </Link>
          </div>
        </header>

        {feedbackMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-semibold text-emerald-800">
            {feedbackMessage}
          </div>
        )}

        {(errorMessage || loadError) && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-semibold text-red-800">
            {errorMessage ?? loadError}
          </div>
        )}

        <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">Imóvel e período</h2>
            <p className="mt-1 text-sm text-slate-600">
              Escolha o imóvel e o intervalo usado nos cálculos do relatório.
            </p>
          </div>

          <form method="get" className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_auto] lg:items-end">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Imóvel
              <select
                name="imovel"
                defaultValue={selectedProperty?.id ?? ""}
                className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-slate-900 outline-none focus:border-blue-700"
              >
                {properties.length === 0 && <option value="">Nenhum imóvel cadastrado</option>}
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title}{property.active ? "" : " — inativo"}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Início
              <input
                type="date"
                name="inicio"
                defaultValue={periodStart}
                className="min-h-12 rounded-xl border border-slate-300 px-4 text-slate-900 outline-none focus:border-blue-700"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Fim
              <input
                type="date"
                name="fim"
                defaultValue={periodEnd}
                className="min-h-12 rounded-xl border border-slate-300 px-4 text-slate-900 outline-none focus:border-blue-700"
              />
            </label>

            <button
              type="submit"
              className="min-h-12 rounded-xl bg-blue-950 px-6 py-3 font-bold text-white transition hover:bg-blue-900"
            >
              Atualizar relatório
            </button>
          </form>
        </section>

        {!selectedProperty ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            Cadastre um imóvel antes de usar o módulo de relatórios.
          </section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Receita bruta</p>
                <p className="mt-2 text-2xl font-black text-emerald-700">{formatCurrency(grossRevenue)}</p>
                <p className="mt-1 text-xs text-slate-500">{revenueEntries.length} lançamento(s)</p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Despesas descontáveis</p>
                <p className="mt-2 text-2xl font-black text-red-700">{formatCurrency(deductibleExpenses)}</p>
                <p className="mt-1 text-xs text-slate-500">Impactam o repasse</p>
              </div>

              <div className="rounded-3xl bg-blue-950 p-5 text-white shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-200">Repasse líquido</p>
                <p className="mt-2 text-2xl font-black">{formatCurrency(netOwnerAmount)}</p>
                <p className="mt-1 text-xs text-blue-200">Receitas − despesas descontáveis</p>
              </div>

              <div className="rounded-3xl bg-amber-50 p-5 shadow-sm ring-1 ring-amber-200">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Integração pendente</p>
                <p className="mt-2 text-2xl font-black text-amber-900">{formatCurrency(pendingMaintenanceTotal)}</p>
                <p className="mt-1 text-xs text-amber-700">Chamados que precisam de sincronização</p>
              </div>

              <div className="rounded-3xl bg-slate-800 p-5 text-white shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Repasse projetado</p>
                <p className="mt-2 text-2xl font-black">{formatCurrency(projectedNetOwnerAmount)}</p>
                <p className="mt-1 text-xs text-slate-300">Considerando manutenção pendente</p>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <h2 className="text-xl font-bold text-slate-900">Proprietário do imóvel</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Estes dados identificam o destinatário da prestação de contas.
                  </p>
                </div>

                <form action={savePropertyOwner} className="grid gap-4 sm:grid-cols-2">
                  {commonHiddenFields}
                  <input type="hidden" name="ownerId" value={owner?.id ?? ""} />

                  <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                    Nome do proprietário *
                    <input
                      name="fullName"
                      required
                      defaultValue={owner?.full_name ?? ""}
                      className="min-h-12 rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-700"
                      placeholder="Nome completo"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    E-mail
                    <input
                      type="email"
                      name="email"
                      defaultValue={owner?.email ?? ""}
                      className="min-h-12 rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-700"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Telefone
                    <input
                      name="phone"
                      defaultValue={owner?.phone ?? ""}
                      className="min-h-12 rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-700"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                    WhatsApp
                    <input
                      name="whatsapp"
                      defaultValue={owner?.whatsapp ?? ""}
                      className="min-h-12 rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-700"
                      placeholder="Ex.: +55 22 99999-9999"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                    Observações internas
                    <textarea
                      name="notes"
                      defaultValue={owner?.notes ?? ""}
                      rows={3}
                      className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-700"
                    />
                  </label>

                  <button
                    type="submit"
                    className="min-h-12 rounded-xl bg-blue-950 px-5 py-3 font-bold text-white transition hover:bg-blue-900 sm:col-span-2"
                  >
                    {owner ? "Salvar dados do proprietário" : "Cadastrar e vincular proprietário"}
                  </button>
                </form>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <h2 className="text-xl font-bold text-slate-900">Nova movimentação financeira</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Registre reservas, receitas e despesas manuais. Manutenções concluídas e cobradas do proprietário entram automaticamente.
                  </p>
                </div>

                <form action={createFinancialEntry} className="grid gap-4 sm:grid-cols-2">
                  {commonHiddenFields}

                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Data *
                    <input
                      type="date"
                      name="entryDate"
                      required
                      defaultValue={periodStart}
                      className="min-h-12 rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-700"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Tipo *
                    <select
                      name="entryType"
                      defaultValue="revenue"
                      className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-blue-700"
                    >
                      <option value="revenue">Receita</option>
                      <option value="expense">Despesa</option>
                    </select>
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Categoria *
                    <input
                      name="category"
                      required
                      placeholder="Ex.: Reserva, Comissão, Luz, Faxina"
                      className="min-h-12 rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-700"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Canal
                    <input
                      name="channel"
                      placeholder="Airbnb, Booking, Venda direta..."
                      className="min-h-12 rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-700"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                    Descrição *
                    <input
                      name="description"
                      required
                      placeholder="Ex.: Reserva Paulo — 03 a 06/08"
                      className="min-h-12 rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-700"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Valor (R$) *
                    <input
                      name="amount"
                      required
                      inputMode="decimal"
                      placeholder="0,00"
                      className="min-h-12 rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-700"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Referência da reserva
                    <input
                      name="reservationReference"
                      placeholder="Código ou hóspede"
                      className="min-h-12 rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-700"
                    />
                  </label>

                  <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 sm:col-span-2">
                    <input type="checkbox" name="deductFromOwner" className="mt-1 h-4 w-4" />
                    <span>
                      Descontar do repasse do proprietário. Use esta opção apenas para despesas que realmente reduzem o valor a repassar.
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="min-h-12 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white transition hover:bg-emerald-800 sm:col-span-2"
                  >
                    Cadastrar movimentação
                  </button>
                </form>
              </div>
            </section>

            {pendingMaintenance.length > 0 && (
              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-amber-950">Manutenções aguardando sincronização</h2>
                    <p className="mt-1 text-sm text-amber-800">
                      A integração é automática. Esta lista funciona como conferência e recuperação caso algum chamado ainda esteja fora do financeiro.
                    </p>
                  </div>
                  <p className="font-black text-amber-950">{formatCurrency(pendingMaintenanceTotal)}</p>
                </div>

                <div className="grid gap-3">
                  {pendingMaintenance.map((ticket) => {
                    const finalCost = Number(ticket.final_cost ?? 0);

                    return (
                      <div
                        key={ticket.id}
                        className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/admin/manutencao/${ticket.id}`}
                              className="font-black text-blue-900 underline underline-offset-2"
                            >
                              {ticket.ticket_number}
                            </Link>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                              {ticket.category}
                            </span>
                          </div>
                          <p className="mt-2 font-semibold text-slate-900">{ticket.problem}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Concluído em {formatDate(ticket.completed_at)} • Custo final: {formatCurrency(finalCost)}
                          </p>
                        </div>

                        {finalCost > 0 ? (
                          <form action={postMaintenanceToFinancial}>
                            {commonHiddenFields}
                            <input type="hidden" name="ticketId" value={ticket.id} />
                            <button
                              type="submit"
                              className="min-h-11 rounded-xl bg-amber-700 px-4 py-2 font-bold text-white transition hover:bg-amber-800"
                            >
                              Sincronizar agora
                            </button>
                          </form>
                        ) : (
                          <span className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
                            Informe o custo final no chamado
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-bold text-slate-900">Receitas por canal</h2>
                <div className="mt-4 divide-y divide-slate-100">
                  {Array.from(revenueByChannel.entries()).length === 0 ? (
                    <p className="py-4 text-sm text-slate-500">Nenhuma receita no período.</p>
                  ) : (
                    Array.from(revenueByChannel.entries())
                      .sort((a, b) => b[1] - a[1])
                      .map(([channel, amount]) => (
                        <div key={channel} className="flex items-center justify-between gap-4 py-3">
                          <span className="font-semibold text-slate-700">{channel}</span>
                          <strong className="text-emerald-700">{formatCurrency(amount)}</strong>
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-bold text-slate-900">Despesas por categoria</h2>
                <div className="mt-4 divide-y divide-slate-100">
                  {Array.from(expenseByCategory.entries()).length === 0 ? (
                    <p className="py-4 text-sm text-slate-500">Nenhuma despesa no período.</p>
                  ) : (
                    Array.from(expenseByCategory.entries())
                      .sort((a, b) => b[1] - a[1])
                      .map(([category, amount]) => (
                        <div key={category} className="flex items-center justify-between gap-4 py-3">
                          <span className="font-semibold text-slate-700">{category}</span>
                          <strong className="text-red-700">{formatCurrency(amount)}</strong>
                        </div>
                      ))
                  )}
                </div>
                {nonDeductibleExpenses > 0 && (
                  <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                    Despesas informativas que não reduzem o repasse: {formatCurrency(nonDeductibleExpenses)}
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Movimentações do período</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Detalhamento que servirá de base para o PDF da prestação de contas.
                  </p>
                </div>
                <strong className="text-sm text-slate-600">{entries.length} lançamento(s)</strong>
              </div>

              {entries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                  Nenhuma movimentação cadastrada neste período.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">Data</th>
                        <th className="px-3 py-3">Tipo</th>
                        <th className="px-3 py-3">Categoria</th>
                        <th className="px-3 py-3">Canal / referência</th>
                        <th className="px-3 py-3">Descrição</th>
                        <th className="px-3 py-3 text-right">Valor</th>
                        <th className="px-3 py-3">Repasse</th>
                        <th className="px-3 py-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entries.map((entry) => (
                        <tr key={entry.id} className="align-top">
                          <td className="px-3 py-4 font-semibold text-slate-700">{formatDate(entry.entry_date)}</td>
                          <td className="px-3 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                entry.entry_type === "revenue"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {entry.entry_type === "revenue" ? "Receita" : "Despesa"}
                            </span>
                          </td>
                          <td className="px-3 py-4 font-semibold text-slate-700">{entry.category}</td>
                          <td className="px-3 py-4 text-slate-600">
                            {entry.channel || entry.reservation_reference || "—"}
                          </td>
                          <td className="max-w-md px-3 py-4 text-slate-700">
                            {entry.description}
                            {entry.maintenance_ticket_id && (
                              <span className="ml-2 rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                                manutenção
                              </span>
                            )}
                          </td>
                          <td
                            className={`whitespace-nowrap px-3 py-4 text-right font-black ${
                              entry.entry_type === "revenue" ? "text-emerald-700" : "text-red-700"
                            }`}
                          >
                            {entry.entry_type === "revenue" ? "+ " : "- "}
                            {formatCurrency(entry.amount)}
                          </td>
                          <td className="px-3 py-4 text-slate-600">
                            {entry.entry_type === "expense"
                              ? entry.deduct_from_owner
                                ? "Desconta"
                                : "Informativa"
                              : "Soma"}
                          </td>
                          <td className="px-3 py-4 text-right">
                            <form action={deleteFinancialEntry}>
                              {commonHiddenFields}
                              <input type="hidden" name="entryId" value={entry.id} />
                              <button
                                type="submit"
                                className="rounded-lg border border-red-200 px-3 py-2 font-bold text-red-700 transition hover:bg-red-50"
                              >
                                Excluir
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
              <div className="rounded-3xl bg-blue-950 p-5 text-white shadow-sm sm:p-6">
                <h2 className="text-xl font-bold">Salvar prestação de contas</h2>
                <p className="mt-2 text-sm text-blue-100">
                  Grave um snapshot dos valores atuais e gere a prestação de contas em formato pronto para PDF.
                </p>

                {owner && selectedProperty && (
                  <Link
                    href={`/admin/relatorios/pdf?imovel=${encodeURIComponent(selectedProperty.id)}&inicio=${periodStart}&fim=${periodEnd}`}
                    target="_blank"
                    className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-700 bg-blue-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800"
                  >
                    Visualizar / salvar PDF do período
                  </Link>
                )}

                <form action={createOwnerReportSnapshot} className="mt-5 grid gap-4">
                  {commonHiddenFields}

                  <label className="grid gap-2 text-sm font-semibold text-blue-100">
                    Observações ao proprietário
                    <textarea
                      name="notes"
                      rows={5}
                      placeholder="Manutenções relevantes, valores pendentes, ocorrências e outras observações do período."
                      className="rounded-xl border border-blue-700 bg-white px-4 py-3 text-slate-900 outline-none"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="submit"
                      name="status"
                      value="draft"
                      className="min-h-12 rounded-xl bg-white px-5 py-3 font-bold text-blue-950 transition hover:bg-blue-100"
                    >
                      Salvar rascunho
                    </button>
                    <button
                      type="submit"
                      name="status"
                      value="closed"
                      disabled={!owner}
                      className="min-h-12 rounded-xl bg-emerald-500 px-5 py-3 font-bold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Fechar relatório
                    </button>
                  </div>

                  {!owner && (
                    <p className="rounded-xl bg-amber-100 px-4 py-3 text-sm font-bold text-amber-950">
                      Cadastre o proprietário antes de salvar a prestação de contas.
                    </p>
                  )}
                </form>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <h2 className="text-xl font-bold text-slate-900">Histórico de relatórios</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Cada registro preserva os valores calculados no momento do fechamento.
                  </p>
                </div>

                {reports.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                    Nenhum relatório salvo para este imóvel.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {reports.map((report) => (
                      <article key={report.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="text-slate-900">
                                {formatDate(report.period_start)} a {formatDate(report.period_end)}
                              </strong>
                              <span className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(report.status)}`}>
                                {getStatusLabel(report.status)}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">
                              Receita {formatCurrency(report.gross_revenue)} • Despesas {formatCurrency(report.deductible_expenses)} • Repasse {formatCurrency(report.net_owner_amount)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Criado em {formatDateTime(report.created_at)}
                              {report.sent_at ? ` • Enviado em ${formatDateTime(report.sent_at)}` : ""}
                            </p>
                            {report.notes && (
                              <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                {report.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/admin/relatorios/pdf?imovel=${encodeURIComponent(selectedProperty.id)}&inicio=${report.period_start}&fim=${report.period_end}`}
                              target="_blank"
                              className="rounded-lg bg-blue-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-900"
                            >
                              PDF
                            </Link>

                            {report.status !== "closed" && (
                              <form action={setOwnerReportStatus}>
                                {commonHiddenFields}
                                <input type="hidden" name="reportId" value={report.id} />
                                <input type="hidden" name="status" value="closed" />
                                <button
                                  type="submit"
                                  className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-800 transition hover:bg-blue-50"
                                >
                                  Marcar fechado
                                </button>
                              </form>
                            )}

                            {report.status !== "sent" && (
                              <form action={setOwnerReportStatus}>
                                {commonHiddenFields}
                                <input type="hidden" name="reportId" value={report.id} />
                                <input type="hidden" name="status" value="sent" />
                                <button
                                  type="submit"
                                  className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-900 transition hover:bg-emerald-200"
                                >
                                  Marcar enviado
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
