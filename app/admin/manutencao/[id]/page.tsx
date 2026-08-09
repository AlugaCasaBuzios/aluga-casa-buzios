import Link from "next/link";
import { redirect } from "next/navigation";

import MaintenanceFileUploader from "@/components/maintenance/MaintenanceFileUploader";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

import {
  addAdminMaintenanceUpdate,
  updateAdminMaintenanceDetails,
} from "./actions";

export const dynamic = "force-dynamic";

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

type AdminMaintenanceDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    salvo?: string;
    dados?: string;
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
  charge_owner: boolean;
  posted_to_financial: boolean;
  visible_to_owner: boolean;
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
    case "campos":
      return "Revise os campos obrigatórios.";
    case "prazo":
      return "Informe uma data de prazo válida.";
    case "valor":
      return "Informe um valor válido.";
    case "responsavel":
      return "O responsável selecionado não está disponível.";
    case "arquivo":
      return "Os arquivos enviados não puderam ser associados ao chamado.";
    case "atualizacao":
      return "Não foi possível salvar a atualização.";
    case "historico":
      return "O chamado foi alterado, mas houve erro ao registrar o histórico.";
    case "salvar":
      return "Não foi possível salvar os dados do chamado.";
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

export default async function AdminMaintenanceDetailPage({
  params,
  searchParams,
}: AdminMaintenanceDetailPageProps) {
  const [{ id }, query] = await Promise.all([
    params,
    searchParams,
  ]);

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile } = await supabase
    .from("management_users")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.active || profile.role !== "admin") {
    redirect("/admin");
  }

  const { data: ticket, error: ticketError } =
    await supabase
      .from("maintenance_tickets")
      .select(
        "id, ticket_number, property_id, location, category, problem, priority, assigned_to, status, due_date, estimated_cost, final_cost, charge_owner, posted_to_financial, visible_to_owner, completed_at, created_by, updated_by, created_at, updated_at"
      )
      .eq("id", id)
      .maybeSingle();

  if (ticketError || !ticket) {
    redirect("/admin/manutencao?erro=chamado");
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
      item.full_name || "Usuário",
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
    <main className="min-h-screen bg-slate-100 py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-blue-950 p-6 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin/manutencao"
              className="text-sm font-bold text-blue-100 underline underline-offset-4"
            >
              ← Voltar para manutenção
            </Link>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-black text-blue-200">
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
            <p className="mt-2 max-w-3xl text-blue-100">
              {ticket.problem}
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-4 text-sm">
            <p>
              <strong>Aberto:</strong>{" "}
              {formatDateTime(ticket.created_at)}
            </p>
            <p className="mt-1">
              <strong>Atualizado:</strong>{" "}
              {formatDateTime(ticket.updated_at)}
            </p>
          </div>
        </div>

        {(query.salvo === "1" ||
          query.dados === "1" ||
          error) && (
          <div
            className={`mb-6 rounded-2xl px-5 py-4 font-semibold ${
              error
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-800"
            }`}
          >
            {error ??
              (query.dados === "1"
                ? "Dados do chamado atualizados."
                : "Atualização registrada no histórico.")}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-6 shadow-lg">
              <h2 className="text-xl font-black text-slate-900">
                Dados do chamado
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
                  <strong>Custo estimado:</strong>{" "}
                  {formatCurrency(ticket.estimated_cost)}
                </p>
                <p>
                  <strong>Custo final:</strong>{" "}
                  {formatCurrency(ticket.final_cost)}
                </p>
                <p>
                  <strong>Concluído em:</strong>{" "}
                  {ticket.completed_at
                    ? formatDateTime(ticket.completed_at)
                    : "—"}
                </p>
                <p>
                  <strong>Financeiro:</strong>{" "}
                  {ticket.charge_owner
                    ? ticket.posted_to_financial
                      ? "Já lançado"
                      : "Pendente de lançamento"
                    : "Não descontar"}
                </p>
              </div>

              <form
                action={updateAdminMaintenanceDetails}
                className="mt-6 space-y-4 border-t border-slate-200 pt-6"
              >
                <input
                  type="hidden"
                  name="ticketId"
                  value={ticket.id}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-bold text-slate-700">
                    Prioridade
                    <select
                      name="priority"
                      defaultValue={ticket.priority}
                      className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-900"
                    >
                      {PRIORITY_OPTIONS.map((option) => (
                        <option
                          key={option}
                          value={option}
                        >
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    Responsável
                    <select
                      name="assignedTo"
                      defaultValue={ticket.assigned_to ?? ""}
                      className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-900"
                    >
                      <option value="">
                        Não atribuído
                      </option>
                      {users
                        .filter((item) => item.active)
                        .map((item) => (
                          <option
                            key={item.user_id}
                            value={item.user_id}
                          >
                            {item.full_name ||
                              (item.role === "admin"
                                ? "Administrador"
                                : "Funcionário")}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    Prazo
                    <input
                      type="date"
                      name="dueDate"
                      defaultValue={
                        ticket.due_date?.slice(0, 10) ?? ""
                      }
                      className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal text-slate-900"
                    />
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    Custo estimado
                    <input
                      name="estimatedCost"
                      inputMode="decimal"
                      defaultValue={
                        ticket.estimated_cost ?? ""
                      }
                      placeholder="Ex.: 350,00"
                      className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal text-slate-900"
                    />
                  </label>
                </div>

                <label className="flex items-start gap-3 rounded-xl bg-orange-50 p-4 text-sm font-semibold text-orange-900">
                  <input
                    type="checkbox"
                    name="chargeOwner"
                    defaultChecked={ticket.charge_owner}
                    className="mt-1"
                  />
                  Descontar este custo do proprietário.
                </label>

                <label className="flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-900">
                  <input
                    type="checkbox"
                    name="visibleToOwner"
                    defaultChecked={ticket.visible_to_owner}
                    className="mt-1"
                  />
                  Permitir que esta manutenção apareça na futura prestação de contas ao proprietário.
                </label>

                <button
                  type="submit"
                  className="min-h-11 rounded-xl bg-blue-950 px-6 font-bold text-white hover:bg-blue-900"
                >
                  Salvar dados do chamado
                </button>
              </form>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-lg">
              <h2 className="text-xl font-black text-slate-900">
                Registrar atualização
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Atualize o andamento, informe o custo final e anexe fotos ou comprovantes.
              </p>

              <form
                action={addAdminMaintenanceUpdate}
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
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-900"
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
                  Comentário / serviço realizado
                  <textarea
                    name="comment"
                    required
                    rows={5}
                    placeholder="Ex.: técnico trocou a peça, testou o equipamento e deixou funcionando normalmente."
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal text-slate-900"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Custo final, se conhecido
                  <input
                    name="finalCost"
                    inputMode="decimal"
                    defaultValue={ticket.final_cost ?? ""}
                    placeholder="Ex.: 380,00"
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal text-slate-900"
                  />
                </label>

                <MaintenanceFileUploader
                  ticketId={ticket.id}
                  accent="blue"
                />

                <button
                  type="submit"
                  className="min-h-12 w-full rounded-xl bg-blue-950 px-6 font-black text-white hover:bg-blue-900"
                >
                  Salvar atualização no histórico
                </button>
              </form>
            </section>
          </div>

          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Histórico compartilhado
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {updates.length}{" "}
                  {updates.length === 1
                    ? "atualização registrada"
                    : "atualizações registradas"}
                </p>
              </div>
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
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
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
                          "Usuário"
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
                        "Usuário"
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
