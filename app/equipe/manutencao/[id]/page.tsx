import Link from "next/link";
import { redirect } from "next/navigation";

import MaintenanceFileUploader from "@/components/maintenance/MaintenanceFileUploader";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

import { addTeamMaintenanceDetailUpdate } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  "Aberto",
  "Em andamento",
  "Aguardando peça",
  "Concluído",
  "Cancelado",
] as const;

type TeamMaintenanceDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    salvo?: string;
    erro?: string;
  }>;
};

type ManagementUser = {
  user_id: string;
  full_name: string | null;
  role: "admin" | "staff";
  active: boolean;
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
  completed_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type MaintenanceUpdate = {
  id: string;
  ticket_id: string;
  status: string | null;
  comment: string;
  attachment_paths: string[];
  created_by: string | null;
  created_at: string;
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

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const dateOnly = value.slice(0, 10);
  const [year, month, day] = dateOnly.split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
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
    case "Concluído":
      return "bg-green-100 text-green-800";
    case "Em andamento":
      return "bg-blue-100 text-blue-800";
    case "Aguardando peça":
      return "bg-amber-100 text-amber-800";
    case "Cancelado":
      return "bg-slate-200 text-slate-700";
    case "Aberto":
      return "bg-violet-100 text-violet-800";
  }
}

function errorMessage(error: string | undefined): string | null {
  switch (error) {
    case "valor":
      return "Informe um custo final válido.";
    case "arquivo":
      return "Os arquivos enviados não puderam ser associados ao chamado.";
    case "atualizacao":
      return "Preencha o status e descreva o andamento.";
    case "historico":
      return "O chamado foi alterado, mas houve erro ao registrar o histórico.";
    case "chamado":
      return "Chamado não encontrado.";
    default:
      return null;
  }
}

function isImagePath(path: string): boolean {
  return /\.(jpe?g|png|webp)$/i.test(path);
}

function fileLabel(path: string, index: number): string {
  if (/\.pdf$/i.test(path)) {
    return `Comprovante PDF ${index + 1}`;
  }

  return `Foto ${index + 1}`;
}

export default async function TeamMaintenanceDetailPage({
  params,
  searchParams,
}: TeamMaintenanceDetailPageProps) {
  const [{ id }, query] = await Promise.all([
    params,
    searchParams,
  ]);

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/equipe/login");
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("management_users")
      .select("user_id, full_name, role, active")
      .eq("user_id", user.id)
      .maybeSingle();

  if (
    profileError ||
    !profile?.active
  ) {
    await supabase.auth.signOut();
    redirect("/equipe/login?erro=acesso");
  }

  const {
    data: ticket,
    error: ticketError,
  } = await supabase
    .from("maintenance_tickets")
    .select(
      "id, ticket_number, property_id, location, category, problem, priority, assigned_to, status, due_date, estimated_cost, final_cost, completed_at, created_by, updated_by, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (ticketError || !ticket) {
    redirect("/equipe/manutencao?erro=chamado");
  }

  const adminSupabase = createSupabaseAdminClient();

  const [
    propertyResult,
    usersResult,
    updatesResult,
  ] = await Promise.all([
    adminSupabase
      .from("property_catalog")
      .select("id, title")
      .eq("id", ticket.property_id)
      .maybeSingle(),
    supabase
      .from("management_users")
      .select("user_id, full_name, role, active")
      .order("full_name"),
    supabase
      .from("maintenance_updates")
      .select(
        "id, ticket_id, status, comment, attachment_paths, created_by, created_at"
      )
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: false }),
  ]);

  const propertyTitle =
    propertyResult.data?.title ?? ticket.property_id;

  const users =
    (usersResult.data ?? []) as ManagementUser[];

  const updates =
    (updatesResult.data ?? []) as MaintenanceUpdate[];

  const userNames = new Map(
    users.map((item) => [
      item.user_id,
      item.full_name || "Equipe",
    ])
  );

  const attachmentPaths = Array.from(
    new Set(
      updates.flatMap(
        (update) => update.attachment_paths ?? []
      )
    )
  );

  const signedUrlByPath = new Map<string, string>();

  await Promise.all(
    attachmentPaths.map(async (path) => {
      const { data } = await adminSupabase.storage
        .from("maintenance-files")
        .createSignedUrl(path, 60 * 60);

      if (data?.signedUrl) {
        signedUrlByPath.set(path, data.signedUrl);
      }
    })
  );

  const error = errorMessage(query.erro);
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue =
    Boolean(
      ticket.due_date &&
        ticket.due_date < today &&
        ticket.status !== "Concluído" &&
        ticket.status !== "Cancelado"
    );

  return (
    <main className="min-h-screen bg-emerald-50/40 py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-emerald-800 p-6 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/equipe/manutencao"
              className="text-sm font-bold text-emerald-100 underline underline-offset-4"
            >
              ← Voltar para meus chamados
            </Link>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-black text-emerald-100">
                {ticket.ticket_number}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${priorityClasses(
                  ticket.priority
                )}`}
              >
                {ticket.priority}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${statusClasses(
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

            <h1 className="mt-3 text-3xl font-black">
              {propertyTitle}
            </h1>
            <p className="mt-2 max-w-3xl text-emerald-50">
              {ticket.problem}
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-4 text-sm">
            <p className="font-bold">
              {profile.full_name || "Equipe"}
            </p>
            <p className="mt-1 text-emerald-100">
              Área compartilhada da manutenção
            </p>
          </div>
        </div>

        {(query.salvo === "1" || error) && (
          <div
            className={`mb-6 rounded-2xl px-5 py-4 font-semibold ${
              error
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-800"
            }`}
          >
            {error ??
              "Atualização registrada e compartilhada com a gestão."}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-6 shadow-lg">
              <h2 className="text-xl font-black text-slate-900">
                Informações do chamado
              </h2>

              <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <p>
                  <strong>Local:</strong>{" "}
                  {ticket.location || "Geral"}
                </p>
                <p>
                  <strong>Categoria:</strong>{" "}
                  {ticket.category}
                </p>
                <p>
                  <strong>Responsável:</strong>{" "}
                  {ticket.assigned_to
                    ? userNames.get(ticket.assigned_to) ??
                      "Equipe"
                    : "Não atribuído"}
                </p>
                <p>
                  <strong>Prazo:</strong>{" "}
                  {formatDate(ticket.due_date)}
                </p>
                <p>
                  <strong>Custo estimado:</strong>{" "}
                  {formatCurrency(ticket.estimated_cost)}
                </p>
                <p>
                  <strong>Custo final:</strong>{" "}
                  {formatCurrency(ticket.final_cost)}
                </p>
                <p>
                  <strong>Aberto em:</strong>{" "}
                  {formatDateTime(ticket.created_at)}
                </p>
                <p>
                  <strong>Última alteração:</strong>{" "}
                  {formatDateTime(ticket.updated_at)}
                </p>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-lg">
              <h2 className="text-xl font-black text-slate-900">
                Compartilhar atualização
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Informe o que foi feito e envie fotos do problema, do serviço ou comprovantes.
              </p>

              <form
                action={addTeamMaintenanceDetailUpdate}
                className="mt-6 space-y-5"
              >
                <input
                  type="hidden"
                  name="ticketId"
                  value={ticket.id}
                />

                <label className="block text-sm font-bold text-slate-700">
                  Status
                  <select
                    name="status"
                    defaultValue={ticket.status}
                    className="mt-2 min-h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 font-normal text-slate-900"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  O que foi feito / andamento
                  <textarea
                    name="comment"
                    required
                    rows={5}
                    placeholder="Ex.: foi identificado vazamento na conexão. A peça será substituída amanhã."
                    className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-3 py-3 font-normal text-slate-900"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Custo final, se conhecido
                  <input
                    name="finalCost"
                    inputMode="decimal"
                    defaultValue={ticket.final_cost ?? ""}
                    placeholder="Ex.: 180,00"
                    className="mt-2 min-h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 font-normal text-slate-900"
                  />
                </label>

                <MaintenanceFileUploader
                  ticketId={ticket.id}
                  accent="green"
                />

                <button
                  type="submit"
                  className="min-h-12 w-full rounded-xl bg-emerald-700 px-6 font-black text-white hover:bg-emerald-800"
                >
                  Salvar e compartilhar atualização
                </button>
              </form>
            </section>
          </div>

          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <div className="border-b border-slate-200 pb-5">
              <h2 className="text-2xl font-black text-slate-900">
                Histórico do chamado
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                As atualizações ficam visíveis para a equipe e para a gestão.
              </p>
            </div>

            <div className="mt-6 space-y-5">
              {updates.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-600">
                  Ainda não há atualizações neste chamado.
                </div>
              ) : (
                updates.map((update) => (
                  <article
                    key={update.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {update.status && (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
                          {update.status}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-slate-500">
                        {formatDateTime(update.created_at)}
                      </span>
                    </div>

                    <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">
                      {update.comment}
                    </p>

                    <p className="mt-3 text-xs font-semibold text-slate-500">
                      Por{" "}
                      {update.created_by
                        ? userNames.get(update.created_by) ??
                          "Equipe"
                        : "Usuário removido"}
                    </p>

                    {(update.attachment_paths ?? []).length >
                      0 && (
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {update.attachment_paths.map(
                          (path, index) => {
                            const signedUrl =
                              signedUrlByPath.get(path);

                            if (!signedUrl) {
                              return (
                                <div
                                  key={path}
                                  className="rounded-xl bg-slate-100 p-4 text-sm text-slate-500"
                                >
                                  Arquivo indisponível.
                                </div>
                              );
                            }

                            if (isImagePath(path)) {
                              return (
                                <a
                                  key={path}
                                  href={signedUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={signedUrl}
                                    alt={fileLabel(path, index)}
                                    className="aspect-[4/3] w-full object-cover"
                                  />
                                  <span className="block px-4 py-3 text-sm font-bold text-slate-700">
                                    {fileLabel(path, index)} — abrir
                                  </span>
                                </a>
                              );
                            }

                            return (
                              <a
                                key={path}
                                href={signedUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex min-h-24 items-center justify-center rounded-2xl border border-slate-200 bg-red-50 px-4 text-center text-sm font-black text-red-800"
                              >
                                {fileLabel(path, index)} — abrir PDF
                              </a>
                            );
                          }
                        )}
                      </div>
                    )}
                  </article>
                ))
              )}

              <article className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Abertura do chamado
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Chamado criado em{" "}
                  {formatDateTime(ticket.created_at)}
                  {ticket.created_by
                    ? ` por ${
                        userNames.get(ticket.created_by) ??
                        "Equipe"
                      }`
                    : ""}
                  .
                </p>
              </article>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
