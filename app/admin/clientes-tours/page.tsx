import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type ClientsPageProps = {
  searchParams: Promise<{
    busca?: string;
    pagamento?: string;
    servico?: string;
  }>;
};

type ClientRecord = {
  id: string;
  name: string;
  company_name: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
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
  service_status: string;
  billing_cycle: string;
};

type TourRecord = {
  id: string;
  title: string;
  slug: string;
};

const paymentLabels: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  overdue: "Atrasado",
  waived: "Isento",
};

const paymentClasses: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900",
  paid: "bg-green-100 text-green-900",
  overdue: "bg-red-100 text-red-800",
  waived: "bg-slate-200 text-slate-700",
};

const serviceLabels: Record<string, string> = {
  active: "Ativo",
  suspended: "Suspenso",
  canceled: "Cancelado",
};

const serviceClasses: Record<string, string> = {
  active: "bg-sky-100 text-sky-900",
  suspended: "bg-orange-100 text-orange-900",
  canceled: "bg-slate-200 text-slate-700",
};

function getDateKey(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

function getEffectivePaymentStatus(
  service: ServiceRecord,
  today: string
): string {
  if (
    service.payment_status === "pending" &&
    service.due_date &&
    service.due_date < today
  ) {
    return "overdue";
  }

  return service.payment_status;
}

function formatCurrencyFromCents(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Sem vencimento";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default async function VirtualTourClientsPage({
  searchParams,
}: ClientsPageProps) {
  const { busca = "", pagamento = "all", servico = "all" } =
    await searchParams;
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
  const [clientsResult, servicesResult, toursResult] = await Promise.all([
    supabase
      .from("virtual_tour_clients")
      .select("id, name, company_name, whatsapp, phone, email, active, created_at")
      .order("name", { ascending: true }),
    supabase
      .from("virtual_tour_services")
      .select(
        "id, client_id, tour_id, amount_cents, due_date, payment_status, service_status, billing_cycle"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("virtual_tours")
      .select("id, title, slug")
      .order("title", { ascending: true }),
  ]);

  const loadingError = clientsResult.error || servicesResult.error || toursResult.error;

  if (loadingError) {
    console.error("Erro ao carregar clientes dos tours:", loadingError);
  }

  const clients = (clientsResult.data ?? []) as ClientRecord[];
  const services = (servicesResult.data ?? []) as ServiceRecord[];
  const tours = (toursResult.data ?? []) as TourRecord[];
  const today = getDateKey(new Date());
  const tourNames = new Map(tours.map((tour) => [tour.id, tour.title]));
  const normalizedSearch = normalizeSearch(busca.trim());

  const servicesByClient = new Map<string, ServiceRecord[]>();
  services.forEach((service) => {
    const current = servicesByClient.get(service.client_id) ?? [];
    current.push(service);
    servicesByClient.set(service.client_id, current);
  });

  const filteredClients = clients.filter((client) => {
    const clientServices = servicesByClient.get(client.id) ?? [];
    const searchable = normalizeSearch(
      [
        client.name,
        client.company_name,
        client.email,
        client.whatsapp,
        ...clientServices.map((item) => tourNames.get(item.tour_id) ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
    );

    const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
    const matchesPayment =
      pagamento === "all" ||
      clientServices.some(
        (item) => getEffectivePaymentStatus(item, today) === pagamento
      );
    const matchesService =
      servico === "all" ||
      clientServices.some((item) => item.service_status === servico);

    return matchesSearch && matchesPayment && matchesService;
  });

  const activeServices = services.filter(
    (service) => service.service_status === "active"
  ).length;
  const overdueServices = services.filter(
    (service) => getEffectivePaymentStatus(service, today) === "overdue"
  ).length;
  const pendingAmount = services
    .filter((service) => {
      const paymentStatus = getEffectivePaymentStatus(service, today);
      return (
        service.service_status !== "canceled" &&
        (paymentStatus === "pending" || paymentStatus === "overdue")
      );
    })
    .reduce((total, service) => total + service.amount_cents, 0);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl bg-blue-950 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-300">
                Comercial dos passeios 360°
              </p>
              <h1 className="mt-2 text-3xl font-black">Clientes e cobranças</h1>
              <p className="mt-2 max-w-2xl leading-7 text-blue-100">
                Acompanhe os clientes, os passeios contratados, vencimentos e a
                situação de cada serviço.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin"
                style={{ color: "#172554" }}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 font-bold text-blue-950 transition hover:bg-sky-100"
              >
                Voltar ao painel
              </Link>
              <Link
                href="/admin/tours"
                style={{ color: "#172554" }}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-sky-100 px-5 py-3 font-bold text-blue-950 transition hover:bg-sky-200"
              >
                Passeios 360°
              </Link>
              <Link
                href="/admin/clientes-tours/novo"
                style={{ color: "#172554" }}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-sky-400 px-5 py-3 font-black text-blue-950 transition hover:bg-sky-300"
              >
                Novo cliente
              </Link>
            </div>
          </div>
        </header>

        {loadingError && (
          <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 px-5 py-4 text-red-900">
            <p className="font-black">Não foi possível carregar o módulo.</p>
            <p className="mt-1 text-sm">
              Confirme se a nova migração SQL foi executada no Supabase.
            </p>
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Clientes ativos</p>
            <p className="mt-2 text-3xl font-black text-blue-950">
              {clients.filter((client) => client.active).length}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Serviços ativos</p>
            <p className="mt-2 text-3xl font-black text-sky-700">{activeServices}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Valor em aberto</p>
            <p className="mt-2 text-3xl font-black text-amber-700">
              {formatCurrencyFromCents(pendingAmount)}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Cobranças atrasadas</p>
            <p className="mt-2 text-3xl font-black text-red-700">{overdueServices}</p>
          </div>
        </section>

        <form className="mt-6 grid gap-4 rounded-2xl bg-white p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Buscar</span>
            <input
              type="search"
              name="busca"
              defaultValue={busca}
              placeholder="Cliente, empresa, contato ou passeio"
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Pagamento</span>
            <select
              name="pagamento"
              defaultValue={pagamento}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-950"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="overdue">Atrasados</option>
              <option value="paid">Pagos</option>
              <option value="waived">Isentos</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Serviço</span>
            <select
              name="servico"
              defaultValue={servico}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-950"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="suspended">Suspensos</option>
              <option value="canceled">Cancelados</option>
            </select>
          </label>
          <button
            type="submit"
            className="min-h-12 self-end rounded-xl bg-blue-950 px-6 py-3 font-black text-white transition hover:bg-blue-900"
          >
            Filtrar
          </button>
        </form>

        <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-lg">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-black text-slate-950">Clientes cadastrados</h2>
            <p className="mt-1 text-sm text-slate-600">
              {filteredClients.length} cliente(s) encontrado(s)
            </p>
          </div>

          {!loadingError && filteredClients.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <h3 className="text-xl font-black text-blue-950">
                Nenhum cliente encontrado
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-slate-600">
                Cadastre o primeiro cliente ou ajuste os filtros da busca.
              </p>
              <Link
                href="/admin/clientes-tours/novo"
                style={{ color: "#ffffff" }}
                className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-6 py-3 font-bold text-white"
              >
                Cadastrar cliente
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredClients.map((client) => {
                const clientServices = servicesByClient.get(client.id) ?? [];
                const clientPendingAmount = clientServices
                  .filter((item) => {
                    const status = getEffectivePaymentStatus(item, today);
                    return status === "pending" || status === "overdue";
                  })
                  .reduce((total, item) => total + item.amount_cents, 0);

                return (
                  <article key={client.id} className="px-6 py-6">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-black text-blue-950">
                            {client.name}
                          </h3>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              client.active
                                ? "bg-green-100 text-green-900"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {client.active ? "Cliente ativo" : "Cliente inativo"}
                          </span>
                        </div>
                        {client.company_name && (
                          <p className="mt-1 font-semibold text-slate-700">
                            {client.company_name}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                          {client.email && <span>{client.email}</span>}
                          {client.whatsapp && (
                            <a
                              href={`https://wa.me/${
                                client.whatsapp.startsWith("55")
                                  ? client.whatsapp
                                  : `55${client.whatsapp}`
                              }`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-green-700 hover:underline"
                            >
                              WhatsApp: {client.whatsapp}
                            </a>
                          )}
                          {!client.whatsapp && client.phone && <span>{client.phone}</span>}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm">
                          <p className="font-bold text-slate-700">
                            {clientServices.length} serviço(s)
                          </p>
                          <p className="mt-1 text-slate-600">
                            Em aberto: {formatCurrencyFromCents(clientPendingAmount)}
                          </p>
                        </div>
                        <Link
                          href={`/admin/clientes-tours/${client.id}`}
                          style={{ color: "#ffffff" }}
                          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 font-black text-white transition hover:bg-blue-900"
                        >
                          Gerenciar cliente
                        </Link>
                      </div>
                    </div>

                    {clientServices.length > 0 && (
                      <div className="mt-5 grid gap-3 lg:grid-cols-2">
                        {clientServices.map((service) => {
                          const paymentStatus = getEffectivePaymentStatus(service, today);
                          return (
                            <div
                              key={service.id}
                              className="rounded-2xl border border-slate-200 p-4"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="font-black text-slate-950">
                                  {tourNames.get(service.tour_id) ?? "Passeio removido"}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-black ${
                                      paymentClasses[paymentStatus] ?? paymentClasses.pending
                                    }`}
                                  >
                                    {paymentLabels[paymentStatus] ?? paymentStatus}
                                  </span>
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-black ${
                                      serviceClasses[service.service_status] ??
                                      serviceClasses.active
                                    }`}
                                  >
                                    {serviceLabels[service.service_status] ??
                                      service.service_status}
                                  </span>
                                </div>
                              </div>
                              <p className="mt-2 text-sm text-slate-600">
                                {formatCurrencyFromCents(service.amount_cents)} · Vence em{" "}
                                {formatDate(service.due_date)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
