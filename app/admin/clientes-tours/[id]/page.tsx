import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

import {
  createVirtualTourService,
  updateVirtualTourClient,
  updateVirtualTourService,
} from "../actions";

export const dynamic = "force-dynamic";

type ClientDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    criado?: string;
    salvo?: string;
    erro?: string;
  }>;
};

type ClientRecord = {
  id: string;
  name: string;
  company_name: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  document: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
};

type ServiceRecord = {
  id: string;
  client_id: string;
  tour_id: string;
  amount_cents: number;
  due_date: string | null;
  payment_status: string;
  paid_at: string | null;
  service_status: string;
  billing_cycle: string;
  notes: string | null;
};

type TourRecord = {
  id: string;
  title: string;
  slug: string;
  status: string;
};

const inputClass =
  "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200";

function formatCurrencyFromCents(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function VirtualTourClientDetailPage({
  params,
  searchParams,
}: ClientDetailPageProps) {
  const { id } = await params;
  const { criado, salvo, erro } = await searchParams;
  const authenticationClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authenticationClient.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: isAdmin } = await authenticationClient.rpc(
    "is_management_admin"
  );

  if (isAdmin !== true) {
    redirect("/admin");
  }

  const supabase = createSupabaseAdminClient();
  const [clientResult, servicesResult, toursResult] = await Promise.all([
    supabase.from("virtual_tour_clients").select("*").eq("id", id).single(),
    supabase
      .from("virtual_tour_services")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("virtual_tours")
      .select("id, title, slug, status")
      .order("title", { ascending: true }),
  ]);

  if (clientResult.error || !clientResult.data) {
    notFound();
  }

  const client = clientResult.data as ClientRecord;
  const services = (servicesResult.data ?? []) as ServiceRecord[];
  const tours = (toursResult.data ?? []) as TourRecord[];
  const tourById = new Map(tours.map((tour) => [tour.id, tour]));
  const assignedTourIds = new Set(
    ((await supabase.from("virtual_tour_services").select("tour_id")).data ?? []).map(
      (item) => item.tour_id as string
    )
  );
  const availableTours = tours.filter((tour) => !assignedTourIds.has(tour.id));
  const totalContracted = services
    .filter((service) => service.service_status !== "canceled")
    .reduce((total, service) => total + service.amount_cents, 0);
  const openAmount = services
    .filter(
      (service) =>
        service.service_status !== "canceled" &&
        (service.payment_status === "pending" ||
          service.payment_status === "overdue")
    )
    .reduce((total, service) => total + service.amount_cents, 0);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl bg-blue-950 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-300">
                Cliente dos passeios 360°
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black">{client.name}</h1>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    client.active
                      ? "bg-green-200 text-green-950"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {client.active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="mt-2 text-blue-100">
                {client.company_name || "Cliente pessoa física"} · Cadastrado em{" "}
                {formatDateTime(client.created_at)}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin/clientes-tours"
                style={{ color: "#172554" }}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 font-bold text-blue-950 transition hover:bg-sky-100"
              >
                Voltar aos clientes
              </Link>
              <Link
                href="/admin/tours"
                style={{ color: "#172554" }}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-sky-300 px-5 py-3 font-bold text-blue-950 transition hover:bg-sky-200"
              >
                Passeios 360°
              </Link>
            </div>
          </div>
        </header>

        {(criado === "1" || salvo) && (
          <div className="mt-6 rounded-2xl border border-green-300 bg-green-50 px-5 py-4 font-bold text-green-900">
            {criado === "1" ? "Cliente cadastrado com sucesso." : salvo}
          </div>
        )}
        {erro && (
          <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 px-5 py-4 font-bold text-red-900">
            {erro}
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Passeios vinculados</p>
            <p className="mt-2 text-3xl font-black text-blue-950">{services.length}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Valor contratado</p>
            <p className="mt-2 text-3xl font-black text-sky-700">
              {formatCurrencyFromCents(totalContracted)}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Valor em aberto</p>
            <p className="mt-2 text-3xl font-black text-amber-700">
              {formatCurrencyFromCents(openAmount)}
            </p>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="text-xl font-black text-blue-950">Dados do cliente</h2>
            <p className="mt-1 text-sm text-slate-600">
              Atualize os contatos e a situação comercial do cadastro.
            </p>

            <form action={updateVirtualTourClient} className="mt-6 space-y-5">
              <input type="hidden" name="client_id" value={client.id} />
              <label className="block">
                <span className="font-bold text-slate-800">Nome do cliente *</span>
                <input
                  name="name"
                  required
                  maxLength={150}
                  defaultValue={client.name}
                  autoComplete="name"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="font-bold text-slate-800">Empresa ou marca</span>
                <input
                  name="company_name"
                  maxLength={150}
                  defaultValue={client.company_name ?? ""}
                  autoComplete="organization"
                  className={inputClass}
                />
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="font-bold text-slate-800">WhatsApp</span>
                  <input
                    name="whatsapp"
                    defaultValue={client.whatsapp ?? ""}
                    inputMode="tel"
                    autoComplete="tel"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="font-bold text-slate-800">Telefone</span>
                  <input
                    name="phone"
                    defaultValue={client.phone ?? ""}
                    inputMode="tel"
                    autoComplete="tel-national"
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="block">
                <span className="font-bold text-slate-800">E-mail</span>
                <input
                  name="email"
                  type="email"
                  maxLength={200}
                  defaultValue={client.email ?? ""}
                  autoComplete="email"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="font-bold text-slate-800">CPF ou CNPJ</span>
                <input
                  name="document"
                  maxLength={40}
                  defaultValue={client.document ?? ""}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="font-bold text-slate-800">Observações</span>
                <textarea
                  name="notes"
                  rows={5}
                  maxLength={3000}
                  defaultValue={client.notes ?? ""}
                  className={`${inputClass} py-3`}
                />
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={client.active}
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-950"
                />
                <span>
                  <span className="block font-black text-slate-900">Cliente ativo</span>
                  <span className="mt-1 block text-sm text-slate-600">
                    Desmarque para arquivar o cadastro sem apagar seu histórico.
                  </span>
                </span>
              </label>
              <button
                type="submit"
                style={{ color: "#ffffff" }}
                className="min-h-12 w-full rounded-xl bg-blue-950 px-5 py-3 font-black text-white transition hover:bg-blue-900"
              >
                Salvar dados do cliente
              </button>
            </form>
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-6 shadow-lg">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h2 className="text-xl font-black text-blue-950">Serviços contratados</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Cada passeio possui controle financeiro e operacional próprio.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                  {services.length} serviço(s)
                </span>
              </div>

              {servicesResult.error ? (
                <p className="mt-6 rounded-xl bg-red-50 p-4 font-bold text-red-800">
                  Não foi possível carregar os serviços deste cliente.
                </p>
              ) : services.length === 0 ? (
                <p className="mt-6 rounded-xl bg-slate-50 p-5 text-slate-600">
                  Este cliente ainda não possui passeio vinculado.
                </p>
              ) : (
                <div className="mt-6 space-y-5">
                  {services.map((service) => {
                    const tour = tourById.get(service.tour_id);

                    return (
                      <form
                        key={service.id}
                        action={updateVirtualTourService}
                        className="rounded-2xl border border-slate-200 p-5"
                      >
                        <input type="hidden" name="client_id" value={client.id} />
                        <input type="hidden" name="service_id" value={service.id} />
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-lg font-black text-slate-950">
                              {tour?.title ?? "Passeio removido"}
                            </h3>
                            {tour && (
                              <div className="mt-2 flex flex-wrap gap-3 text-sm font-bold">
                                <Link
                                  href={`/admin/tours/${tour.id}`}
                                  className="text-blue-700 hover:underline"
                                >
                                  Abrir editor
                                </Link>
                                <Link
                                  href={`/tour/${tour.slug}`}
                                  target="_blank"
                                  className="text-sky-700 hover:underline"
                                >
                                  Ver passeio público
                                </Link>
                              </div>
                            )}
                          </div>
                          {service.paid_at && (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-900">
                              Pago em {formatDateTime(service.paid_at)}
                            </span>
                          )}
                        </div>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                          <label className="block">
                            <span className="text-sm font-bold text-slate-700">Valor</span>
                            <input
                              name="amount"
                              type="number"
                              min="0"
                              max="10000000"
                              step="0.01"
                              required
                              defaultValue={(service.amount_cents / 100).toFixed(2)}
                              className={inputClass}
                            />
                          </label>
                          <label className="block">
                            <span className="text-sm font-bold text-slate-700">Vencimento</span>
                            <input
                              name="due_date"
                              type="date"
                              defaultValue={service.due_date ?? ""}
                              className={inputClass}
                            />
                          </label>
                          <label className="block">
                            <span className="text-sm font-bold text-slate-700">Pagamento</span>
                            <select
                              name="payment_status"
                              defaultValue={service.payment_status}
                              className={inputClass}
                            >
                              <option value="pending">Pendente</option>
                              <option value="paid">Pago</option>
                              <option value="overdue">Atrasado</option>
                              <option value="waived">Isento</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="text-sm font-bold text-slate-700">Serviço</span>
                            <select
                              name="service_status"
                              defaultValue={service.service_status}
                              className={inputClass}
                            >
                              <option value="active">Ativo</option>
                              <option value="suspended">Suspenso</option>
                              <option value="canceled">Cancelado</option>
                            </select>
                          </label>
                          <label className="block sm:col-span-2">
                            <span className="text-sm font-bold text-slate-700">Cobrança</span>
                            <select
                              name="billing_cycle"
                              defaultValue={service.billing_cycle}
                              className={inputClass}
                            >
                              <option value="one_time">Pagamento único</option>
                              <option value="monthly">Mensal</option>
                              <option value="annual">Anual</option>
                            </select>
                          </label>
                          <label className="block sm:col-span-2">
                            <span className="text-sm font-bold text-slate-700">Observações</span>
                            <textarea
                              name="service_notes"
                              rows={3}
                              maxLength={2000}
                              defaultValue={service.notes ?? ""}
                              className={`${inputClass} py-3`}
                            />
                          </label>
                        </div>
                        <button
                          type="submit"
                          style={{ color: "#ffffff" }}
                          className="mt-5 min-h-12 w-full rounded-xl bg-blue-950 px-5 py-3 font-black text-white transition hover:bg-blue-900"
                        >
                          Salvar este serviço
                        </button>
                      </form>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-lg">
              <h2 className="text-xl font-black text-blue-950">Vincular outro passeio</h2>
              <p className="mt-1 text-sm text-slate-600">
                Um mesmo cliente pode contratar quantos passeios forem necessários.
              </p>

              {availableTours.length === 0 ? (
                <div className="mt-6 rounded-xl bg-slate-50 p-5 text-slate-600">
                  <p>Não há passeio livre para vincular.</p>
                  <Link
                    href="/admin/tours/novo"
                    className="mt-3 inline-block font-black text-blue-700 hover:underline"
                  >
                    Cadastrar novo passeio 360°
                  </Link>
                </div>
              ) : (
                <form action={createVirtualTourService} className="mt-6 grid gap-5 sm:grid-cols-2">
                  <input type="hidden" name="client_id" value={client.id} />
                  <label className="block sm:col-span-2">
                    <span className="font-bold text-slate-800">Passeio 360° *</span>
                    <select name="tour_id" required defaultValue="" className={inputClass}>
                      <option value="" disabled>
                        Selecione o passeio
                      </option>
                      {availableTours.map((tour) => (
                        <option key={tour.id} value={tour.id}>
                          {tour.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-bold text-slate-800">Valor contratado</span>
                    <input
                      name="amount"
                      type="number"
                      min="0"
                      max="10000000"
                      step="0.01"
                      className={inputClass}
                      placeholder="0,00"
                    />
                  </label>
                  <label className="block">
                    <span className="font-bold text-slate-800">Vencimento</span>
                    <input name="due_date" type="date" className={inputClass} />
                  </label>
                  <label className="block">
                    <span className="font-bold text-slate-800">Pagamento</span>
                    <select name="payment_status" defaultValue="pending" className={inputClass}>
                      <option value="pending">Pendente</option>
                      <option value="paid">Pago</option>
                      <option value="overdue">Atrasado</option>
                      <option value="waived">Isento</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-bold text-slate-800">Serviço</span>
                    <select name="service_status" defaultValue="active" className={inputClass}>
                      <option value="active">Ativo</option>
                      <option value="suspended">Suspenso</option>
                      <option value="canceled">Cancelado</option>
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="font-bold text-slate-800">Tipo de cobrança</span>
                    <select name="billing_cycle" defaultValue="one_time" className={inputClass}>
                      <option value="one_time">Pagamento único</option>
                      <option value="monthly">Mensal</option>
                      <option value="annual">Anual</option>
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="font-bold text-slate-800">Observações</span>
                    <textarea
                      name="service_notes"
                      rows={3}
                      maxLength={2000}
                      className={`${inputClass} py-3`}
                    />
                  </label>
                  <button
                    type="submit"
                    style={{ color: "#ffffff" }}
                    className="min-h-12 rounded-xl bg-blue-950 px-5 py-3 font-black text-white transition hover:bg-blue-900 sm:col-span-2"
                  >
                    Vincular passeio ao cliente
                  </button>
                </form>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
