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

export const dynamic =
  "force-dynamic";

type ToursPageProps = {
  searchParams: Promise<{
    criado?: string;
  }>;
};

type VirtualTourRecord = {
  id: string;
  property_id: string | null;
  title: string;
  slug: string;
  status: string;
  access_mode: string;
  access_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type PropertyRecord = {
  id: string;
  title: string;
};

type TourServiceRecord = {
  tour_id: string;
  client_id: string;
  payment_status: string;
  service_status: string;
};

type TourClientRecord = {
  id: string;
  name: string;
};

const statusLabels:
  Record<string, string> = {
    draft: "Rascunho",
    published: "Publicado",
    archived: "Arquivado",
  };

const statusClasses:
  Record<string, string> = {
    draft:
      "bg-amber-100 text-amber-900",
    published:
      "bg-green-100 text-green-900",
    archived:
      "bg-slate-200 text-slate-700",
  };

function formatDate(
  value: string
): string {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone:
        "America/Sao_Paulo",
    }
  ).format(new Date(value));
}

export default async function ToursPage({
  searchParams,
}: ToursPageProps) {
  const {
    criado,
  } = await searchParams;

  const authenticationClient =
    await createSupabaseServerClient();

  const {
    data: {
      user,
    },
  } =
    await authenticationClient.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const {
    data: isAdmin,
  } =
    await authenticationClient.rpc(
      "is_management_admin"
    );

  if (isAdmin !== true) {
    redirect("/admin");
  }

  const supabase =
    createSupabaseAdminClient();

  const [
    toursResult,
    propertiesResult,
    servicesResult,
    clientsResult,
  ] = await Promise.all([
    supabase
      .from("virtual_tours")
      .select(`
        id,
        property_id,
        title,
        slug,
        status,
        access_mode,
        access_expires_at,
        created_at,
        updated_at
      `)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("property_catalog")
      .select("id, title")
      .order("title", {
        ascending: true,
      }),

    supabase
      .from("virtual_tour_services")
      .select("tour_id, client_id, payment_status, service_status"),

    supabase
      .from("virtual_tour_clients")
      .select("id, name"),
  ]);

  if (toursResult.error) {
    console.error(
      "Erro ao carregar passeios virtuais:",
      toursResult.error
    );
  }

  const tours =
    (toursResult.data ?? []) as
      VirtualTourRecord[];

  const properties =
    (propertiesResult.data ?? []) as
      PropertyRecord[];

  const propertyNames =
    new Map(
      properties.map(
        (property) => [
          property.id,
          property.title,
        ]
      )
    );

  const services =
    (servicesResult.data ?? []) as
      TourServiceRecord[];

  const clients =
    (clientsResult.data ?? []) as
      TourClientRecord[];

  const serviceByTour = new Map(
    services.map((service) => [
      service.tour_id,
      service,
    ])
  );

  const clientNames = new Map(
    clients.map((client) => [
      client.id,
      client.name,
    ])
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl bg-blue-950 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-300">
                Aluga Casa Búzios
              </p>

              <h1 className="mt-2 text-3xl font-black">
                Passeios virtuais 360°
              </h1>

              <p className="mt-2 max-w-2xl leading-7 text-blue-100">
                Cadastre, organize e publique os
                passeios virtuais dos imóveis.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin"
                style={{
                  color: "#172554",
                }}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/40 bg-white px-5 py-3 font-bold text-blue-950 transition hover:bg-sky-100"
              >
                Voltar ao painel
              </Link>

              <Link
                href="/admin/clientes-tours"
                style={{
                  color: "#172554",
                }}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-sky-100 px-5 py-3 font-bold text-blue-950 transition hover:bg-sky-200"
              >
                Clientes e cobranças
              </Link>

              <Link
                href="/admin/tours/novo"
                style={{
                  color: "#172554",
                }}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-sky-400 px-5 py-3 font-black text-blue-950 shadow-md transition hover:bg-sky-300"
              >
                Novo passeio 360°
              </Link>
            </div>
          </div>
        </header>

        {criado === "1" && (
          <div className="mt-6 rounded-2xl border border-green-300 bg-green-50 px-5 py-4 font-bold text-green-900">
            Passeio virtual cadastrado com sucesso.
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-lg">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-black text-slate-950">
              Passeios cadastrados
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              {tours.length} passeio(s) encontrado(s)
            </p>
          </div>

          {toursResult.error ? (
            <div className="px-6 py-12 text-center">
              <p className="font-bold text-red-700">
                Não foi possível carregar os passeios.
              </p>
            </div>
          ) : tours.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <h3 className="text-xl font-black text-blue-950">
                Nenhum passeio cadastrado
              </h3>

              <p className="mx-auto mt-2 max-w-xl leading-7 text-slate-600">
                Cadastre o primeiro passeio e depois
                adicione os ambientes 360° do imóvel.
              </p>

              <Link
                href="/admin/tours/novo"
                style={{
                  color: "#ffffff",
                }}
                className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-6 py-3 font-bold text-white transition hover:bg-blue-900"
              >
                Cadastrar primeiro passeio
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {tours.map((tour) => {
                const statusClass =
                  statusClasses[tour.status] ??
                  statusClasses.draft;

                const service =
                  serviceByTour.get(tour.id);

                const clientName = service
                  ? clientNames.get(
                      service.client_id
                    )
                  : null;

                return (
                  <article
                    key={tour.id}
                    className="flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-black text-blue-950">
                          {tour.title}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${statusClass}`}
                        >
                          {statusLabels[tour.status] ??
                            tour.status}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            tour.access_mode === "password"
                              ? "bg-sky-100 text-sky-900"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {tour.access_mode === "password"
                            ? "Protegido por senha"
                            : "Acesso público"}
                        </span>

                        {tour.access_expires_at && (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              new Date(tour.access_expires_at).getTime() <= Date.now()
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-900"
                            }`}
                          >
                            {new Date(tour.access_expires_at).getTime() <= Date.now()
                              ? "Link expirado"
                              : `Expira em ${formatDate(tour.access_expires_at)}`}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm font-semibold text-slate-700">
                        {tour.property_id
                          ? propertyNames.get(
                              tour.property_id
                            ) ?? tour.property_id
                          : "Sem imóvel vinculado"}
                      </p>

                      <p className="mt-1 break-all text-sm text-slate-500">
                        /tour/{tour.slug}
                      </p>

                      <p className="mt-2 text-sm font-semibold text-slate-700">
                        {clientName
                          ? `Cliente: ${clientName}`
                          : "Sem cliente comercial vinculado"}
                      </p>

                      {service && (
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          Serviço: {service.service_status === "active"
                            ? "Ativo"
                            : service.service_status === "suspended"
                            ? "Suspenso"
                            : "Cancelado"}
                          {" · "}
                          Pagamento: {service.payment_status === "paid"
                            ? "Pago"
                            : service.payment_status === "waived"
                            ? "Isento"
                            : service.payment_status === "overdue"
                            ? "Atrasado"
                            : "Pendente"}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-slate-500">
                        Criado em {formatDate(tour.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <span className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">
                        Editor de ambientes disponível
                      </span>

                      <Link
                        href={`/admin/tours/${tour.id}`}
                        style={{
                          color: "#ffffff",
                        }}
                        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 font-black text-white transition hover:bg-blue-900"
                      >
                        Gerenciar passeio
                      </Link>
                    </div>
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
