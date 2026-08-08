import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

import {
  createMaintenanceTicket,
  updateMaintenanceTicketStatus,
} from "./actions";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  "Aberto",
  "Em andamento",
  "Aguardando peça",
  "Concluído",
  "Cancelado",
] as const;

const PRIORITY_OPTIONS = ["Baixa", "Média", "Alta", "Urgente"] as const;

const CATEGORY_OPTIONS = [
  "Elétrica",
  "Hidráulica",
  "Ar-condicionado",
  "Piscina",
  "Jardim",
  "Móveis / equipamentos",
  "Eletrodomésticos",
  "Internet / TV",
  "Estrutura",
  "Pintura",
  "Limpeza",
  "Outro",
] as const;

const LOCATION_OPTIONS = [
  "Geral",
  "Sala",
  "Cozinha",
  "Quarto 1",
  "Quarto 2",
  "Quarto 3",
  "Banheiro",
  "Área externa",
  "Piscina",
  "Jardim",
  "Garagem",
  "Lavanderia",
] as const;

type MaintenancePageProps = {
  searchParams: Promise<{
    criado?: string;
    salvo?: string;
    erro?: string;
    status?: string;
    imovel?: string;
    q?: string;
  }>;
};

type ManagementUser = {
  user_id: string;
  full_name: string | null;
  role: "admin" | "staff";
  active: boolean;
};

type PropertyCatalogRow = {
  id: string;
  title: string;
  active: boolean;
  display_order: number;
};

type MaintenanceTicket = {
  id: string;
  ticket_number: string;
  property_id: string;
  location: string | null;
  category: string;
  problem: string;
  priority: "Baixa" | "Média" | "Alta" | "Urgente";
  assigned_to: string | null;
  status:
    | "Aberto"
    | "Em andamento"
    | "Aguardando peça"
    | "Concluído"
    | "Cancelado";
  due_date: string | null;
  estimated_cost: number | null;
  final_cost: number | null;
  charge_owner: boolean;
  posted_to_financial: boolean;
  visible_to_owner: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function formatCurrency(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: string | null): string {
  if (!date) {
    return "—";
  }

  const dateOnly = date.slice(0, 10);
  const [year, month, day] = dateOnly.split("-");
  return `${day}/${month}/${year}`;
}

function getTodayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

function getErrorMessage(error?: string): string | null {
  switch (error) {
    case "campos":
      return "Preencha imóvel, categoria, problema e prioridade.";
    case "prazo":
      return "O prazo informado não é uma data válida.";
    case "valor":
      return "O custo estimado informado não é válido.";
    case "imovel":
      return "O imóvel selecionado não foi encontrado.";
    case "responsavel":
      return "O responsável selecionado não está disponível.";
    case "salvar":
      return "Não foi possível cadastrar o chamado de manutenção.";
    case "status":
      return "O novo status do chamado não é válido.";
    case "chamado":
      return "O chamado de manutenção não foi encontrado.";
    case "atualizar":
      return "Não foi possível atualizar o chamado de manutenção.";
    default:
      return null;
  }
}

function getPriorityClasses(priority: MaintenanceTicket["priority"]): string {
  switch (priority) {
    case "Urgente":
      return "bg-red-100 text-red-800";
    case "Alta":
      return "bg-orange-100 text-orange-800";
    case "Média":
      return "bg-amber-100 text-amber-800";
    case "Baixa":
      return "bg-slate-100 text-slate-700";
  }
}

function getStatusClasses(status: MaintenanceTicket["status"]): string {
  switch (status) {
    case "Aberto":
      return "bg-blue-100 text-blue-800";
    case "Em andamento":
      return "bg-violet-100 text-violet-800";
    case "Aguardando peça":
      return "bg-amber-100 text-amber-800";
    case "Concluído":
      return "bg-green-100 text-green-800";
    case "Cancelado":
      return "bg-slate-200 text-slate-700";
  }
}

export default async function MaintenanceAdminPage({
  searchParams,
}: MaintenancePageProps) {
  const { criado, salvo, erro, status, imovel, q } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("management_users")
    .select("user_id, full_name, role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Erro ao carregar perfil administrativo:", profileError);
  }

  if (!profile?.active || profile.role !== "admin") {
    redirect("/admin");
  }

  const adminSupabase = createSupabaseAdminClient();

  const [ticketsResult, usersResult, propertiesResult] = await Promise.all([
    supabase
      .from("maintenance_tickets")
      .select(`
        id,
        ticket_number,
        property_id,
        location,
        category,
        problem,
        priority,
        assigned_to,
        status,
        due_date,
        estimated_cost,
        final_cost,
        charge_owner,
        posted_to_financial,
        visible_to_owner,
        completed_at,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: false }),

    supabase
      .from("management_users")
      .select("user_id, full_name, role, active")
      .eq("active", true)
      .order("full_name", { ascending: true }),

    adminSupabase
      .from("property_catalog")
      .select("id, title, active, display_order")
      .order("display_order", { ascending: true })
      .order("title", { ascending: true }),
  ]);

  if (ticketsResult.error) {
    console.error("Erro ao carregar chamados de manutenção:", ticketsResult.error);

    return (
      <main className="min-h-screen bg-slate-100 px-4 py-12">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-red-700">
            Não foi possível carregar a manutenção
          </h1>
          <p className="mt-3 text-slate-600">
            Verifique a tabela maintenance_tickets e as permissões do usuário no Supabase.
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-flex rounded-xl bg-blue-950 px-5 py-3 font-bold text-white"
          >
            Voltar ao painel
          </Link>
        </div>
      </main>
    );
  }

  if (usersResult.error) {
    console.error("Erro ao carregar equipe:", usersResult.error);
  }

  if (propertiesResult.error) {
    console.error("Erro ao carregar imóveis para manutenção:", propertiesResult.error);
  }

  const tickets = (ticketsResult.data ?? []) as MaintenanceTicket[];
  const managementUsers = (usersResult.data ?? []) as ManagementUser[];
  const properties = (propertiesResult.data ?? []) as PropertyCatalogRow[];

  const propertyNames = new Map(properties.map((property) => [property.id, property.title]));
  const userNames = new Map(
    managementUsers.map((managementUser) => [
      managementUser.user_id,
      managementUser.full_name || (managementUser.role === "admin" ? "Administrador" : "Funcionário"),
    ])
  );

  const today = getTodayDateOnly();
  const openTickets = tickets.filter(
    (ticket) => ticket.status !== "Concluído" && ticket.status !== "Cancelado"
  );
  const urgentTickets = openTickets.filter(
    (ticket) => ticket.priority === "Urgente" || ticket.priority === "Alta"
  );
  const overdueTickets = openTickets.filter(
    (ticket) => Boolean(ticket.due_date && ticket.due_date < today)
  );
  const awaitingPartTickets = tickets.filter((ticket) => ticket.status === "Aguardando peça");
  const completedTickets = tickets.filter((ticket) => ticket.status === "Concluído");
  const financialPending = completedTickets.filter(
    (ticket) => ticket.charge_owner && !ticket.posted_to_financial
  );

  const normalizedQuery = (q ?? "").trim().toLocaleLowerCase("pt-BR");
  const filteredTickets = tickets.filter((ticket) => {
    if (status && status !== "todos" && ticket.status !== status) {
      return false;
    }

    if (imovel && imovel !== "todos" && ticket.property_id !== imovel) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const searchableText = [
      ticket.ticket_number,
      propertyNames.get(ticket.property_id) ?? ticket.property_id,
      ticket.problem,
      ticket.category,
      ticket.location ?? "",
      ticket.assigned_to ? userNames.get(ticket.assigned_to) ?? "" : "",
    ]
      .join(" ")
      .toLocaleLowerCase("pt-BR");

    return searchableText.includes(normalizedQuery);
  });

  const errorMessage = getErrorMessage(erro);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-3xl bg-blue-950 p-8 text-white shadow-lg">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                Aluga Casa Búzios
              </p>
              <h1 className="mt-2 text-3xl font-bold">Controle de manutenção</h1>
              <p className="mt-2 text-blue-100">
                Chamados, responsáveis, prazos, custos e acompanhamento da equipe
              </p>
            </div>

            <Link
              href="/admin"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-center font-bold text-white transition hover:bg-white hover:text-blue-950"
            >
              Voltar ao painel
            </Link>
          </div>
        </header>

        {criado === "1" && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-800">
            Chamado de manutenção cadastrado com sucesso.
          </div>
        )}

        {salvo === "1" && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-800">
            Status do chamado atualizado com sucesso.
          </div>
        )}

        {errorMessage && (
          <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-semibold text-red-800">
            {errorMessage}
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ["Abertos", openTickets.length, "text-blue-800"],
            ["Urgentes / altos", urgentTickets.length, "text-red-700"],
            ["Atrasados", overdueTickets.length, "text-red-700"],
            ["Aguardando peça", awaitingPartTickets.length, "text-amber-800"],
            ["Concluídos", completedTickets.length, "text-green-700"],
            ["Pendentes no financeiro", financialPending.length, "text-orange-800"],
          ].map(([label, value, colorClass]) => (
            <div key={String(label)} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
              <p className={`mt-2 text-3xl font-black ${colorClass}`}>{value}</p>
            </div>
          ))}
        </section>

        <section className="mb-8 rounded-3xl bg-white p-6 shadow-lg md:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Abrir novo chamado</h2>
            <p className="mt-1 text-slate-600">
              Se o prazo ficar vazio, o sistema calcula automaticamente conforme a prioridade.
            </p>
          </div>

          <form action={createMaintenanceTicket} className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-2 text-sm font-bold text-slate-700">
              Imóvel *
              <select name="propertyId" required defaultValue="" className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-900">
                <option value="" disabled>Selecione o imóvel</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title}{property.active ? "" : " — inativo"}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-bold text-slate-700">
              Ambiente / local
              <select name="location" defaultValue="Geral" className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-900">
                {LOCATION_OPTIONS.map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-bold text-slate-700">
              Categoria *
              <select name="category" required defaultValue="Outro" className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-900">
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-bold text-slate-700">
              Prioridade *
              <select name="priority" required defaultValue="Média" className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-900">
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-bold text-slate-700 xl:col-span-2">
              Problema / solicitação *
              <textarea
                name="problem"
                required
                rows={4}
                placeholder="Ex.: ar-condicionado do quarto 2 não está gelando."
                className="rounded-xl border border-slate-300 px-3 py-3 font-normal text-slate-900"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-bold text-slate-700">
              Responsável
              <select name="assignedTo" defaultValue="" className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-900">
                <option value="">Não atribuído</option>
                {managementUsers.map((managementUser) => (
                  <option key={managementUser.user_id} value={managementUser.user_id}>
                    {managementUser.full_name || "Usuário"} — {managementUser.role === "admin" ? "Administrador" : "Funcionário"}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="flex flex-col gap-2 text-sm font-bold text-slate-700">
                Prazo
                <input type="date" name="dueDate" className="min-h-12 rounded-xl border border-slate-300 px-3 font-normal text-slate-900" />
              </label>

              <label className="flex flex-col gap-2 text-sm font-bold text-slate-700">
                Custo estimado
                <input
                  type="text"
                  inputMode="decimal"
                  name="estimatedCost"
                  placeholder="Ex.: 380,00"
                  className="min-h-12 rounded-xl border border-slate-300 px-3 font-normal text-slate-900"
                />
              </label>
            </div>

            <div className="md:col-span-2 xl:col-span-4 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                <input type="checkbox" name="chargeOwner" className="h-5 w-5" />
                Descontar do proprietário quando concluído
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                <input type="checkbox" name="visibleToOwner" className="h-5 w-5" />
                Pode aparecer no relatório do proprietário
              </label>
            </div>

            <div className="md:col-span-2 xl:col-span-4 flex justify-end">
              <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-7 py-3 font-bold text-white transition hover:bg-blue-900">
                Cadastrar chamado
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-lg">
          <div className="border-b border-slate-200 p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Chamados cadastrados</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {filteredTickets.length} de {tickets.length} chamados exibidos
                </p>
              </div>

              <form method="get" className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-3xl xl:grid-cols-[1.4fr_1fr_1fr_auto]">
                <input
                  type="search"
                  name="q"
                  defaultValue={q ?? ""}
                  placeholder="Buscar chamado..."
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-slate-900"
                />

                <select name="status" defaultValue={status ?? "todos"} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900">
                  <option value="todos">Todos os status</option>
                  {STATUS_OPTIONS.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>{statusOption}</option>
                  ))}
                </select>

                <select name="imovel" defaultValue={imovel ?? "todos"} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900">
                  <option value="todos">Todos os imóveis</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>{property.title}</option>
                  ))}
                </select>

                <button type="submit" className="min-h-11 rounded-xl bg-slate-900 px-5 font-bold text-white hover:bg-slate-800">
                  Filtrar
                </button>
              </form>
            </div>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <h3 className="text-lg font-bold text-slate-900">Nenhum chamado encontrado</h3>
              <p className="mt-2 text-slate-600">Abra o primeiro chamado ou altere os filtros.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 p-4 md:hidden">
                {filteredTickets.map((ticket) => {
                  const isOverdue = Boolean(
                    ticket.due_date &&
                    ticket.due_date < today &&
                    ticket.status !== "Concluído" &&
                    ticket.status !== "Cancelado"
                  );

                  return (
                    <article key={ticket.id} className={`rounded-2xl border p-5 ${isOverdue ? "border-red-300 bg-red-50/40" : "border-slate-200 bg-white"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{ticket.ticket_number}</p>
                          <h3 className="mt-1 font-bold text-slate-900">{propertyNames.get(ticket.property_id) ?? ticket.property_id}</h3>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${getPriorityClasses(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-slate-700">{ticket.problem}</p>

                      <div className="mt-4 grid gap-2 text-sm text-slate-600">
                        <p><strong>Local:</strong> {ticket.location || "—"}</p>
                        <p><strong>Categoria:</strong> {ticket.category}</p>
                        <p><strong>Responsável:</strong> {ticket.assigned_to ? userNames.get(ticket.assigned_to) ?? "Usuário" : "Não atribuído"}</p>
                        <p><strong>Prazo:</strong> {formatDate(ticket.due_date)} {isOverdue ? "• ATRASADO" : ""}</p>
                        <p><strong>Custo:</strong> {formatCurrency(ticket.final_cost ?? ticket.estimated_cost)}</p>
                        {ticket.charge_owner && !ticket.posted_to_financial && ticket.status === "Concluído" && (
                          <p className="font-bold text-orange-700">Pendente de lançamento no financeiro</p>
                        )}
                      </div>

                      <form action={updateMaintenanceTicketStatus} className="mt-5 flex gap-2">
                        <input type="hidden" name="ticketId" value={ticket.id} />
                        <select name="status" defaultValue={ticket.status} className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900">
                          {STATUS_OPTIONS.map((statusOption) => (
                            <option key={statusOption} value={statusOption}>{statusOption}</option>
                          ))}
                        </select>
                        <button type="submit" className="min-h-11 rounded-xl bg-blue-950 px-4 text-sm font-bold text-white">
                          Salvar
                        </button>
                      </form>
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1300px] text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-5 py-4">Chamado</th>
                      <th className="px-5 py-4">Imóvel / problema</th>
                      <th className="px-5 py-4">Prioridade</th>
                      <th className="px-5 py-4">Responsável</th>
                      <th className="px-5 py-4">Prazo</th>
                      <th className="px-5 py-4">Custo</th>
                      <th className="px-5 py-4">Financeiro</th>
                      <th className="px-5 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTickets.map((ticket) => {
                      const isOverdue = Boolean(
                        ticket.due_date &&
                        ticket.due_date < today &&
                        ticket.status !== "Concluído" &&
                        ticket.status !== "Cancelado"
                      );

                      return (
                        <tr key={ticket.id} className={isOverdue ? "bg-red-50/60" : "bg-white"}>
                          <td className="px-5 py-4 align-top">
                            <p className="font-black text-slate-900">{ticket.ticket_number}</p>
                            <p className="mt-1 text-xs text-slate-500">{formatDate(ticket.created_at)}</p>
                          </td>
                          <td className="max-w-md px-5 py-4 align-top">
                            <p className="font-bold text-slate-900">{propertyNames.get(ticket.property_id) ?? ticket.property_id}</p>
                            <p className="mt-1 text-sm text-slate-700">{ticket.problem}</p>
                            <p className="mt-2 text-xs text-slate-500">{ticket.location || "Geral"} • {ticket.category}</p>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getPriorityClasses(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                          </td>
                          <td className="px-5 py-4 align-top text-sm text-slate-700">
                            {ticket.assigned_to ? userNames.get(ticket.assigned_to) ?? "Usuário" : "Não atribuído"}
                          </td>
                          <td className="px-5 py-4 align-top text-sm">
                            <p className={isOverdue ? "font-bold text-red-700" : "text-slate-700"}>{formatDate(ticket.due_date)}</p>
                            {isOverdue && <p className="mt-1 text-xs font-black text-red-700">ATRASADO</p>}
                          </td>
                          <td className="px-5 py-4 align-top text-sm font-semibold text-slate-800">
                            {formatCurrency(ticket.final_cost ?? ticket.estimated_cost)}
                          </td>
                          <td className="px-5 py-4 align-top text-xs">
                            {ticket.charge_owner ? (
                              ticket.posted_to_financial ? (
                                <span className="font-bold text-green-700">Lançado</span>
                              ) : (
                                <span className="font-bold text-orange-700">A lançar</span>
                              )
                            ) : (
                              <span className="text-slate-500">Não desconta</span>
                            )}
                          </td>
                          <td className="px-5 py-4 align-top">
                            <span className={`mb-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(ticket.status)}`}>
                              {ticket.status}
                            </span>
                            <form action={updateMaintenanceTicketStatus} className="flex gap-2">
                              <input type="hidden" name="ticketId" value={ticket.id} />
                              <select name="status" defaultValue={ticket.status} className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-900">
                                {STATUS_OPTIONS.map((statusOption) => (
                                  <option key={statusOption} value={statusOption}>{statusOption}</option>
                                ))}
                              </select>
                              <button type="submit" className="min-h-10 rounded-lg bg-blue-950 px-3 text-xs font-bold text-white">
                                Salvar
                              </button>
                            </form>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
