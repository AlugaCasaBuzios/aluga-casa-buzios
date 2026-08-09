import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

import {
  teamLogout,
} from "../actions";

import {
  addTeamMaintenanceUpdate,
  createTeamMaintenanceTicket,
} from "./actions";

export const dynamic =
  "force-dynamic";

const STATUS_OPTIONS = [
  "Aberto",
  "Em andamento",
  "Aguardando peça",
  "Concluído",
  "Cancelado",
] as const;

const PRIORITY_OPTIONS = [
  "Baixa",
  "Média",
  "Alta",
  "Urgente",
] as const;

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

type TeamMaintenancePageProps = {
  searchParams: Promise<{
    criado?: string;
    salvo?: string;
    erro?: string;
    status?: string;
    q?: string;
    meus?: string;
  }>;
};

type PropertyRow = {
  id: string;
  title: string;
  active: boolean;
  display_order: number;
};

type ManagementUser = {
  user_id: string;
  full_name: string | null;
};

type MaintenanceTicket = {
  id: string;
  ticket_number: string;
  property_id: string;
  location: string | null;
  category: string;
  problem: string;
  priority:
    | "Baixa"
    | "Média"
    | "Alta"
    | "Urgente";
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
  created_at: string;
  updated_at: string;
};

type MaintenanceUpdate = {
  id: string;
  ticket_id: string;
  status: string | null;
  comment: string;
  created_by: string | null;
  created_at: string;
};

function formatDate(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

  const dateOnly =
    value.slice(0, 10);

  const [
    year,
    month,
    day,
  ] = dateOnly.split("-");

  return `${day}/${month}/${year}`;
}

function formatDateTime(
  value: string
): string {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  ).format(
    new Date(value)
  );
}

function formatCurrency(
  value: number | null
): string {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(value);
}

function priorityClasses(
  priority: MaintenanceTicket["priority"]
): string {
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

function statusClasses(
  status: MaintenanceTicket["status"]
): string {
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

function getErrorMessage(
  error?: string
): string | null {
  switch (error) {
    case "campos":
      return "Preencha imóvel, categoria, problema e prioridade.";
    case "imovel":
      return "O imóvel selecionado não foi encontrado.";
    case "salvar":
      return "Não foi possível abrir o chamado.";
    case "atualizacao":
      return "Informe o status e escreva uma atualização.";
    case "valor":
      return "O custo final informado não é válido.";
    case "chamado":
      return "O chamado não foi encontrado.";
    case "historico":
      return "O chamado foi atualizado, mas não foi possível registrar o comentário.";
    default:
      return null;
  }
}

export default async function TeamMaintenancePage({
  searchParams,
}: TeamMaintenancePageProps) {
  const {
    criado,
    salvo,
    erro,
    status,
    q,
    meus,
  } = await searchParams;

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
    error: profileError,
  } = await supabase
    .from("management_users")
    .select(
      "user_id, full_name, role, active"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile?.active
  ) {
    redirect(
      "/equipe/login?erro=acesso"
    );
  }

  const adminSupabase =
    createSupabaseAdminClient();

  const [
    ticketsResult,
    propertiesResult,
    usersResult,
  ] = await Promise.all([
    supabase
      .from("maintenance_tickets")
      .select(
        "id, ticket_number, property_id, location, category, problem, priority, assigned_to, status, due_date, estimated_cost, final_cost, created_at, updated_at"
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      ),

    adminSupabase
      .from("property_catalog")
      .select(
        "id, title, active, display_order"
      )
      .eq("active", true)
      .order(
        "display_order",
        {
          ascending: true,
        }
      )
      .order(
        "title",
        {
          ascending: true,
        }
      ),

    adminSupabase
      .from("management_users")
      .select(
        "user_id, full_name"
      )
      .eq("active", true)
      .order(
        "full_name",
        {
          ascending: true,
        }
      ),
  ]);

  if (ticketsResult.error) {
    console.error(
      "Erro ao carregar manutenção da equipe:",
      ticketsResult.error
    );
  }

  const tickets =
    (ticketsResult.data ??
      []) as MaintenanceTicket[];

  const properties =
    (propertiesResult.data ??
      []) as PropertyRow[];

  const users =
    (usersResult.data ??
      []) as ManagementUser[];

  const ticketIds =
    tickets.map(
      (ticket) => ticket.id
    );

  let updates: MaintenanceUpdate[] =
    [];

  if (ticketIds.length > 0) {
    const {
      data: updateData,
      error: updateError,
    } = await supabase
      .from("maintenance_updates")
      .select(
        "id, ticket_id, status, comment, created_by, created_at"
      )
      .in(
        "ticket_id",
        ticketIds
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(300);

    if (updateError) {
      console.error(
        "Erro ao carregar histórico da manutenção:",
        updateError
      );
    }

    updates =
      (updateData ??
        []) as MaintenanceUpdate[];
  }

  const propertyNames =
    new Map(
      properties.map(
        (property) => [
          property.id,
          property.title,
        ]
      )
    );

  const userNames =
    new Map(
      users.map(
        (managementUser) => [
          managementUser.user_id,
          managementUser.full_name ??
            "Usuário",
        ]
      )
    );

  const updatesByTicket =
    new Map<
      string,
      MaintenanceUpdate[]
    >();

  updates.forEach(
    (update) => {
      const current =
        updatesByTicket.get(
          update.ticket_id
        ) ?? [];

      if (current.length < 3) {
        current.push(update);
        updatesByTicket.set(
          update.ticket_id,
          current
        );
      }
    }
  );

  const normalizedQuery =
    (q ?? "")
      .trim()
      .toLocaleLowerCase(
        "pt-BR"
      );

  const filteredTickets =
    tickets.filter(
      (ticket) => {
        if (
          status &&
          status !== "todos" &&
          ticket.status !== status
        ) {
          return false;
        }

        if (
          meus === "1" &&
          ticket.assigned_to !==
            user.id
        ) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        const searchable = [
          ticket.ticket_number,
          ticket.problem,
          ticket.category,
          ticket.location ?? "",
          propertyNames.get(
            ticket.property_id
          ) ?? "",
        ]
          .join(" ")
          .toLocaleLowerCase(
            "pt-BR"
          );

        return searchable.includes(
          normalizedQuery
        );
      }
    );

  const openTickets =
    tickets.filter(
      (ticket) =>
        ticket.status !==
          "Concluído" &&
        ticket.status !==
          "Cancelado"
    );

  const myOpenTickets =
    openTickets.filter(
      (ticket) =>
        ticket.assigned_to ===
        user.id
    );

  const urgentTickets =
    openTickets.filter(
      (ticket) =>
        ticket.priority ===
          "Urgente" ||
        ticket.priority ===
          "Alta"
    );

  const waitingTickets =
    openTickets.filter(
      (ticket) =>
        ticket.status ===
        "Aguardando peça"
    );

  const errorMessage =
    getErrorMessage(erro);

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 rounded-3xl bg-emerald-800 p-7 text-white shadow-lg">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-200">
                Aluga Casa Búzios
              </p>

              <h1 className="mt-2 text-3xl font-black">
                Área da equipe
              </h1>

              <p className="mt-2 text-emerald-100">
                Olá,{" "}
                {profile.full_name ??
                  "Equipe"}.
                Compartilhe o andamento dos chamados.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {profile.role === "admin" && (
                <Link
                  href="/admin"
                  className="inline-flex min-h-11 items-center rounded-xl bg-white px-5 font-bold text-blue-950"
                >
                  Painel admin
                </Link>
              )}

              <form
                action={teamLogout}
              >
                <button
                  type="submit"
                  className="min-h-11 rounded-xl border border-white/30 bg-white/10 px-5 font-bold text-white hover:bg-white hover:text-emerald-900"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>
        </header>

        {criado === "1" && (
          <p className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-800">
            Chamado aberto com sucesso.
          </p>
        )}

        {salvo === "1" && (
          <p className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-800">
            Atualização compartilhada com a equipe.
          </p>
        )}

        {errorMessage && (
          <p className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-semibold text-red-800">
            {errorMessage}
          </p>
        )}

        <section className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">
              Em aberto
            </p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {openTickets.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">
              Meus chamados
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-700">
              {myOpenTickets.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">
              Urgentes / altos
            </p>
            <p className="mt-2 text-3xl font-black text-red-700">
              {urgentTickets.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">
              Aguardando peça
            </p>
            <p className="mt-2 text-3xl font-black text-amber-700">
              {waitingTickets.length}
            </p>
          </div>
        </section>

        <details className="mb-7 rounded-3xl bg-white shadow-lg">
          <summary className="cursor-pointer p-6 text-xl font-black text-slate-900">
            + Abrir novo chamado
          </summary>

          <form
            action={
              createTeamMaintenanceTicket
            }
            className="grid gap-4 border-t border-slate-200 p-6 md:grid-cols-2"
          >
            <label className="text-sm font-bold text-slate-700">
              Imóvel
              <select
                name="propertyId"
                required
                defaultValue=""
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-900"
              >
                <option
                  value=""
                  disabled
                >
                  Selecione
                </option>
                {properties.map(
                  (property) => (
                    <option
                      key={
                        property.id
                      }
                      value={
                        property.id
                      }
                    >
                      {property.title}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="text-sm font-bold text-slate-700">
              Ambiente / local
              <select
                name="location"
                defaultValue="Geral"
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-900"
              >
                {LOCATION_OPTIONS.map(
                  (option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="text-sm font-bold text-slate-700">
              Categoria
              <select
                name="category"
                defaultValue="Outro"
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-900"
              >
                {CATEGORY_OPTIONS.map(
                  (option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="text-sm font-bold text-slate-700">
              Prioridade
              <select
                name="priority"
                defaultValue="Média"
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-900"
              >
                {PRIORITY_OPTIONS.map(
                  (option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="md:col-span-2 text-sm font-bold text-slate-700">
              Problema / solicitação
              <textarea
                name="problem"
                required
                rows={3}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-900"
                placeholder="Descreva o problema encontrado..."
              />
            </label>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="min-h-12 rounded-xl bg-emerald-700 px-7 font-bold text-white hover:bg-emerald-800"
              >
                Abrir chamado
              </button>
            </div>
          </form>
        </details>

        <section className="mb-7 rounded-3xl bg-white p-5 shadow-lg">
          <form
            method="get"
            className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto_auto]"
          >
            <input
              name="q"
              type="search"
              defaultValue={q ?? ""}
              placeholder="Buscar chamado..."
              className="min-h-11 rounded-xl border border-slate-300 px-3 text-slate-900"
            />

            <select
              name="status"
              defaultValue={
                status ?? "todos"
              }
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
            >
              <option value="todos">
                Todos os status
              </option>
              {STATUS_OPTIONS.map(
                (option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                )
              )}
            </select>

            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                name="meus"
                value="1"
                defaultChecked={
                  meus === "1"
                }
              />
              Só meus
            </label>

            <button
              type="submit"
              className="min-h-11 rounded-xl bg-slate-900 px-5 font-bold text-white"
            >
              Filtrar
            </button>
          </form>
        </section>

        <section className="space-y-5">
          {filteredTickets.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center text-slate-600 shadow">
              Nenhum chamado encontrado.
            </div>
          ) : (
            filteredTickets.map(
              (ticket) => {
                const isOverdue =
                  Boolean(
                    ticket.due_date &&
                      ticket.due_date <
                        today &&
                      ticket.status !==
                        "Concluído" &&
                      ticket.status !==
                        "Cancelado"
                  );

                const recentUpdates =
                  updatesByTicket.get(
                    ticket.id
                  ) ?? [];

                return (
                  <article
                    key={ticket.id}
                    className={`overflow-hidden rounded-3xl border bg-white shadow-lg ${
                      isOverdue
                        ? "border-red-300"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="grid gap-5 p-6 lg:grid-cols-[1.3fr_0.8fr]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-slate-500">
                            {
                              ticket.ticket_number
                            }
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${priorityClasses(
                              ticket.priority
                            )}`}
                          >
                            {
                              ticket.priority
                            }
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(
                              ticket.status
                            )}`}
                          >
                            {ticket.status}
                          </span>

                          {isOverdue && (
                            <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">
                              ATRASADO
                            </span>
                          )}
                        </div>

                        <h2 className="mt-3 text-xl font-black text-slate-900">
                          {propertyNames.get(
                            ticket.property_id
                          ) ??
                            ticket.property_id}
                        </h2>

                        <p className="mt-2 leading-7 text-slate-700">
                          {ticket.problem}
                        </p>

                        <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                          <p>
                            <strong>
                              Local:
                            </strong>{" "}
                            {ticket.location ??
                              "Geral"}
                          </p>
                          <p>
                            <strong>
                              Categoria:
                            </strong>{" "}
                            {ticket.category}
                          </p>
                          <p>
                            <strong>
                              Responsável:
                            </strong>{" "}
                            {ticket.assigned_to
                              ? userNames.get(
                                  ticket.assigned_to
                                ) ??
                                "Usuário"
                              : "Não atribuído"}
                          </p>
                          <p>
                            <strong>
                              Prazo:
                            </strong>{" "}
                            {formatDate(
                              ticket.due_date
                            )}
                          </p>
                          <p>
                            <strong>
                              Custo estimado:
                            </strong>{" "}
                            {formatCurrency(
                              ticket.estimated_cost
                            )}
                          </p>
                          <p>
                            <strong>
                              Custo final:
                            </strong>{" "}
                            {formatCurrency(
                              ticket.final_cost
                            )}
                          </p>
                        </div>

                        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                          <h3 className="font-black text-slate-800">
                            Últimas atualizações
                          </h3>

                          {recentUpdates.length ===
                          0 ? (
                            <p className="mt-2 text-sm text-slate-500">
                              Ainda não há comentários compartilhados.
                            </p>
                          ) : (
                            <div className="mt-3 space-y-3">
                              {recentUpdates.map(
                                (update) => (
                                  <div
                                    key={
                                      update.id
                                    }
                                    className="border-l-2 border-emerald-300 pl-3"
                                  >
                                    <p className="text-sm text-slate-700">
                                      {
                                        update.comment
                                      }
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {update.created_by
                                        ? userNames.get(
                                            update.created_by
                                          ) ??
                                          "Equipe"
                                        : "Equipe"}
                                      {" • "}
                                      {formatDateTime(
                                        update.created_at
                                      )}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <form
                        action={
                          addTeamMaintenanceUpdate
                        }
                        className="rounded-2xl bg-emerald-50 p-5"
                      >
                        <input
                          type="hidden"
                          name="ticketId"
                          value={ticket.id}
                        />

                        <h3 className="font-black text-emerald-900">
                          Compartilhar atualização
                        </h3>

                        <label className="mt-4 block text-sm font-bold text-slate-700">
                          Status
                          <select
                            name="status"
                            defaultValue={
                              ticket.status
                            }
                            className="mt-2 min-h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 font-normal text-slate-900"
                          >
                            {STATUS_OPTIONS.map(
                              (option) => (
                                <option
                                  key={option}
                                  value={option}
                                >
                                  {option}
                                </option>
                              )
                            )}
                          </select>
                        </label>

                        <label className="mt-4 block text-sm font-bold text-slate-700">
                          O que foi feito / andamento
                          <textarea
                            name="comment"
                            required
                            rows={4}
                            className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-3 py-3 font-normal text-slate-900"
                            placeholder="Ex.: técnico verificou o equipamento e solicitou a peça..."
                          />
                        </label>

                        <label className="mt-4 block text-sm font-bold text-slate-700">
                          Custo final, se já conhecido
                          <input
                            name="finalCost"
                            inputMode="decimal"
                            className="mt-2 min-h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 font-normal text-slate-900"
                            placeholder="Ex.: 380,00"
                          />
                        </label>

                        <button
                          type="submit"
                          className="mt-5 min-h-11 w-full rounded-xl bg-emerald-700 px-5 font-bold text-white hover:bg-emerald-800"
                        >
                          Salvar e compartilhar
                        </button>
                      </form>
                    </div>
                  </article>
                );
              }
            )
          )}
        </section>
      </div>
    </main>
  );
}
