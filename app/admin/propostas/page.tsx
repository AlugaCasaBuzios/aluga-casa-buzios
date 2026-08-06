import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type ProposalsPageProps = {
  searchParams: Promise<{
    busca?: string;
    status?: string;
    ordem?: string;
    excluido?: string;
  }>;
};

type StatusFilter =
  | "all"
  | "new"
  | "contacted"
  | "evaluating"
  | "approved"
  | "rejected";

type SortOrder =
  | "newest"
  | "oldest";

const statusFilters: StatusFilter[] = [
  "all",
  "new",
  "contacted",
  "evaluating",
  "approved",
  "rejected",
];

const sortOrders: SortOrder[] = [
  "newest",
  "oldest",
];

type ProposalRecord = {
  id: string;
  created_at: string;

  owner_name: string;
  owner_whatsapp: string;
  owner_email: string | null;

  property_name: string | null;
  property_type: string | null;

  neighborhood: string | null;
  city: string | null;
  state: string | null;

  maximum_guests: number | null;
  bedrooms: number | null;
  bathrooms: number | null;

  photo_count: number | null;
  status: string;
};

type StatusInformation = {
  label: string;
  className: string;
};

function formatDateTime(
  value: string
): string {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Data não informada";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone:
        "America/Sao_Paulo",
    }
  ).format(date);
}

function formatText(
  value: string | null
): string {
  return (
    value?.trim() ||
    "Não informado"
  );
}

function formatNumber(
  value: number | null
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "Não informado";
  }

  return String(value);
}

function formatPropertyType(
  value: string | null
): string {
  const propertyTypes: Record<
    string,
    string
  > = {
    house: "Casa",
    apartment: "Apartamento",
    flat: "Flat",
    loft: "Loft",
    guesthouse:
      "Casa de hóspedes",
    other: "Outro",
  };

  if (!value) {
    return "Não informado";
  }

  return (
    propertyTypes[value] ||
    value
  );
}

function getStatusInformation(
  status: string
): StatusInformation {
  switch (status) {
    case "contacted":
      return {
        label: "Em contato",
        className:
          "bg-amber-100 text-amber-800",
      };

    case "evaluating":
      return {
        label: "Em avaliação",
        className:
          "bg-purple-100 text-purple-800",
      };

    case "approved":
      return {
        label: "Aprovada",
        className:
          "bg-green-100 text-green-800",
      };

    case "rejected":
      return {
        label: "Recusada",
        className:
          "bg-red-100 text-red-800",
      };

    case "new":
    default:
      return {
        label: "Nova",
        className:
          "bg-sky-100 text-sky-800",
      };
  }
}

function getWhatsAppUrl(
  value: string
): string | null {
  const digits =
    value.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  const normalizedNumber =
    digits.startsWith("55")
      ? digits
      : `55${digits}`;

  const message =
    "Olá! Recebemos sua proposta de imóvel pelo site da Aluga Casa Búzios e gostaríamos de conversar.";

  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(
    message
  )}`;
}

function normalizeSearchText(
  value: string | null | undefined
): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase();
}

function parseStatusFilter(
  value: string | undefined
): StatusFilter {
  if (
    statusFilters.includes(
      value as StatusFilter
    )
  ) {
    return value as StatusFilter;
  }

  return "all";
}

function parseSortOrder(
  value: string | undefined
): SortOrder {
  if (
    sortOrders.includes(
      value as SortOrder
    )
  ) {
    return value as SortOrder;
  }

  return "newest";
}

function buildStatusHref(
  status: StatusFilter,
  searchTerm: string,
  sortOrder: SortOrder
): string {
  const params =
    new URLSearchParams();

  if (searchTerm) {
    params.set(
      "busca",
      searchTerm
    );
  }

  if (status !== "all") {
    params.set(
      "status",
      status
    );
  }

  if (sortOrder !== "newest") {
    params.set(
      "ordem",
      sortOrder
    );
  }

  const queryString =
    params.toString();

  return queryString
    ? `/admin/propostas?${queryString}`
    : "/admin/propostas";
}

export default async function ProposalsPage({
  searchParams,
}: ProposalsPageProps) {
  const {
    busca,
    status,
    ordem,
    excluido,
  } = await searchParams;

  const searchTerm =
    (busca ?? "")
      .trim()
      .slice(0, 100);

  const selectedStatus =
    parseStatusFilter(status);

  const selectedSortOrder =
    parseSortOrder(ordem);

  const authenticationClient =
    await createSupabaseServerClient();

  const {
    data: { user },
  } =
    await authenticationClient.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const supabase =
    createSupabaseAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "property_management_leads"
    )
    .select(`
      id,
      created_at,
      owner_name,
      owner_whatsapp,
      owner_email,
      property_name,
      property_type,
      neighborhood,
      city,
      state,
      maximum_guests,
      bedrooms,
      bathrooms,
      photo_count,
      status
    `)
    .order("created_at", {
      ascending: false,
    })
    .limit(200);

  if (error) {
    console.error(
      "Erro ao carregar propostas:",
      error
    );

    return (
      <main className="min-h-screen bg-slate-100 px-4 py-12">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-red-700">
            Não foi possível carregar as propostas
          </h1>

          <p className="mt-3 text-slate-600">
            Ocorreu um erro ao consultar as propostas
            no Supabase.
          </p>

          <Link
            href="/admin"
            style={{
              color: "#ffffff",
            }}
            className="mt-7 inline-flex rounded-xl bg-blue-950 px-6 py-3 font-bold transition hover:bg-blue-900"
          >
            Voltar ao painel
          </Link>
        </div>
      </main>
    );
  }

  const allProposals =
    (data ??
      []) as ProposalRecord[];

  const newProposals =
    allProposals.filter(
      (proposal) =>
        proposal.status === "new"
    ).length;

  const contactedProposals =
    allProposals.filter(
      (proposal) =>
        proposal.status ===
        "contacted"
    ).length;

  const evaluatingProposals =
    allProposals.filter(
      (proposal) =>
        proposal.status ===
        "evaluating"
    ).length;

  const approvedProposals =
    allProposals.filter(
      (proposal) =>
        proposal.status ===
        "approved"
    ).length;

  const rejectedProposals =
    allProposals.filter(
      (proposal) =>
        proposal.status ===
        "rejected"
    ).length;

  const normalizedSearchTerm =
    normalizeSearchText(
      searchTerm
    );

  const searchDigits =
    searchTerm.replace(
      /\D/g,
      ""
    );

  const proposals =
    allProposals
      .filter((proposal) => {
        const matchesStatus =
          selectedStatus ===
            "all" ||
          proposal.status ===
            selectedStatus;

        if (!matchesStatus) {
          return false;
        }

        if (!searchTerm) {
          return true;
        }

        const searchableText =
          normalizeSearchText(
            [
              proposal.owner_name,
              proposal.owner_whatsapp,
              proposal.owner_email,
              proposal.property_name,
              proposal.property_type,
              formatPropertyType(
                proposal.property_type
              ),
              proposal.neighborhood,
              proposal.city,
              proposal.state,
            ]
              .filter(Boolean)
              .join(" ")
          );

        const matchesText =
          searchableText.includes(
            normalizedSearchTerm
          );

        const matchesPhone =
          Boolean(searchDigits) &&
          proposal.owner_whatsapp
            .replace(/\D/g, "")
            .includes(searchDigits);

        return (
          matchesText ||
          matchesPhone
        );
      })
      .sort((first, second) => {
        const firstTime =
          new Date(
            first.created_at
          ).getTime();

        const secondTime =
          new Date(
            second.created_at
          ).getTime();

        const safeFirstTime =
          Number.isNaN(firstTime)
            ? 0
            : firstTime;

        const safeSecondTime =
          Number.isNaN(secondTime)
            ? 0
            : secondTime;

        return selectedSortOrder ===
          "oldest"
          ? safeFirstTime -
              safeSecondTime
          : safeSecondTime -
              safeFirstTime;
      });

  const filtersAreActive =
    Boolean(searchTerm) ||
    selectedStatus !== "all" ||
    selectedSortOrder !==
      "newest";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl bg-blue-950 p-7 text-white shadow-lg sm:p-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-sky-300">
                Aluga Casa Búzios
              </p>

              <h1 className="mt-2 text-3xl font-black">
                Propostas de imóveis
              </h1>

              <p className="mt-3 text-blue-100">
                Consulte os imóveis enviados por
                proprietários interessados na
                administração da Aluga Casa Búzios.
              </p>
            </div>

            <Link
              href="/admin"
              style={{
                color: "#172554",
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 py-3 font-bold shadow-sm transition hover:bg-blue-100"
            >
              ← Voltar ao painel
            </Link>
          </div>
        </header>

        {excluido === "1" && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-800"
          >
            Proposta e fotos excluídas com sucesso.
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatusSummary
            label="Novas"
            value={newProposals}
            className="border-sky-200 bg-sky-50 text-sky-900"
            href={buildStatusHref(
              "new",
              searchTerm,
              selectedSortOrder
            )}
            active={
              selectedStatus === "new"
            }
          />

          <StatusSummary
            label="Em contato"
            value={
              contactedProposals
            }
            className="border-amber-200 bg-amber-50 text-amber-900"
            href={buildStatusHref(
              "contacted",
              searchTerm,
              selectedSortOrder
            )}
            active={
              selectedStatus ===
              "contacted"
            }
          />

          <StatusSummary
            label="Em avaliação"
            value={
              evaluatingProposals
            }
            className="border-purple-200 bg-purple-50 text-purple-900"
            href={buildStatusHref(
              "evaluating",
              searchTerm,
              selectedSortOrder
            )}
            active={
              selectedStatus ===
              "evaluating"
            }
          />

          <StatusSummary
            label="Aprovadas"
            value={
              approvedProposals
            }
            className="border-green-200 bg-green-50 text-green-900"
            href={buildStatusHref(
              "approved",
              searchTerm,
              selectedSortOrder
            )}
            active={
              selectedStatus ===
              "approved"
            }
          />

          <StatusSummary
            label="Recusadas"
            value={rejectedProposals}
            className="border-red-200 bg-red-50 text-red-900"
            href={buildStatusHref(
              "rejected",
              searchTerm,
              selectedSortOrder
            )}
            active={
              selectedStatus ===
              "rejected"
            }
          />
        </section>

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-lg">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Pesquisar e filtrar
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Encontre uma proposta pelo proprietário,
              imóvel, bairro, telefone ou e-mail.
            </p>
          </div>

          <form
            action="/admin/propostas"
            method="get"
            className="mt-6 grid gap-4 lg:grid-cols-4"
          >
            <div className="lg:col-span-2">
              <label
                htmlFor="proposal-search"
                className="text-sm font-bold text-slate-700"
              >
                Pesquisa
              </label>

              <input
                id="proposal-search"
                name="busca"
                type="search"
                defaultValue={searchTerm}
                maxLength={100}
                placeholder="Ex.: João, Centro, casa ou telefone"
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-600 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div>
              <label
                htmlFor="proposal-status"
                className="text-sm font-bold text-slate-700"
              >
                Status
              </label>

              <select
                id="proposal-status"
                name="status"
                defaultValue={selectedStatus}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-600 focus:ring-4 focus:ring-sky-100"
              >
                <option value="all">
                  Todos os status
                </option>

                <option value="new">
                  Novas
                </option>

                <option value="contacted">
                  Em contato
                </option>

                <option value="evaluating">
                  Em avaliação
                </option>

                <option value="approved">
                  Aprovadas
                </option>

                <option value="rejected">
                  Recusadas
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="proposal-order"
                className="text-sm font-bold text-slate-700"
              >
                Ordenação
              </label>

              <select
                id="proposal-order"
                name="ordem"
                defaultValue={selectedSortOrder}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-600 focus:ring-4 focus:ring-sky-100"
              >
                <option value="newest">
                  Mais recentes
                </option>

                <option value="oldest">
                  Mais antigas
                </option>
              </select>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:col-span-4 lg:justify-end">
              {filtersAreActive && (
                <Link
                  href="/admin/propostas"
                  style={{
                    color: "#172554",
                  }}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-blue-950 px-6 py-3 font-bold transition hover:bg-blue-50"
                >
                  Limpar filtros
                </Link>
              )}

              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-7 py-3 font-bold text-white shadow-sm transition hover:bg-blue-900"
              >
                Aplicar filtros
              </button>
            </div>
          </form>
        </section>

        <section className="mt-8">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Propostas recebidas
              </h2>

              <p className="mt-1 text-slate-600">
                {filtersAreActive ? (
                  <>
                    {proposals.length}{" "}
                    {proposals.length === 1
                      ? "resultado"
                      : "resultados"}{" "}
                    de {allProposals.length}{" "}
                    {allProposals.length === 1
                      ? "proposta recebida"
                      : "propostas recebidas"}
                  </>
                ) : (
                  <>
                    {allProposals.length}{" "}
                    {allProposals.length === 1
                      ? "proposta encontrada"
                      : "propostas encontradas"}
                  </>
                )}
              </p>
            </div>

            <p className="text-sm text-slate-500">
              {selectedSortOrder ===
              "oldest"
                ? "Mais antigas primeiro"
                : "Mais recentes primeiro"}
            </p>
          </div>

          {proposals.length === 0 ? (
            <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-lg">
              <div
                aria-hidden="true"
                className="text-5xl"
              >
                🏠
              </div>

              <h2 className="mt-5 text-2xl font-bold text-slate-900">
                {allProposals.length === 0
                  ? "Nenhuma proposta recebida"
                  : "Nenhuma proposta encontrada"}
              </h2>

              <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">
                {allProposals.length === 0
                  ? "Quando um proprietário preencher o formulário “Anuncie conosco”, a proposta aparecerá aqui."
                  : "Não encontramos propostas com os filtros informados. Limpe os filtros ou tente outra pesquisa."}
              </p>

              {filtersAreActive && (
                <Link
                  href="/admin/propostas"
                  style={{
                    color: "#ffffff",
                  }}
                  className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-6 py-3 font-bold transition hover:bg-blue-900"
                >
                  Limpar filtros
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {proposals.map(
                (proposal) => {
                  const whatsappUrl =
                    getWhatsAppUrl(
                      proposal.owner_whatsapp
                    );

                  const statusInformation =
                    getStatusInformation(
                      proposal.status
                    );

                  return (
                    <article
                      key={proposal.id}
                      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg"
                    >
                      <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-wider text-sky-700">
                              {formatPropertyType(
                                proposal.property_type
                              )}
                            </p>

                            <h2 className="mt-2 text-2xl font-bold text-blue-950">
                              {proposal.property_name ||
                                "Imóvel sem nome"}
                            </h2>

                            <p className="mt-2 text-sm text-slate-500">
                              Enviada em{" "}
                              {formatDateTime(
                                proposal.created_at
                              )}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`inline-flex rounded-full px-4 py-2 text-sm font-bold ${statusInformation.className}`}
                            >
                              {
                                statusInformation.label
                              }
                            </span>

                            <span className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-900">
                              {proposal.photo_count ??
                                0}{" "}
                              {(proposal.photo_count ??
                                0) === 1
                                ? "foto"
                                : "fotos"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="grid gap-5 sm:grid-cols-2">
                          <InfoItem
                            label="Proprietário"
                            value={formatText(
                              proposal.owner_name
                            )}
                          />

                          <InfoItem
                            label="WhatsApp"
                            value={formatText(
                              proposal.owner_whatsapp
                            )}
                          />

                          <InfoItem
                            label="E-mail"
                            value={formatText(
                              proposal.owner_email
                            )}
                          />

                          <InfoItem
                            label="Localização"
                            value={[
                              proposal.neighborhood,
                              proposal.city,
                              proposal.state,
                            ]
                              .filter(Boolean)
                              .join(" — ") ||
                              "Não informada"}
                          />
                        </div>

                        <div className="mt-6 grid grid-cols-3 gap-3">
                          <SummaryItem
                            label="Hóspedes"
                            value={formatNumber(
                              proposal.maximum_guests
                            )}
                          />

                          <SummaryItem
                            label="Quartos"
                            value={formatNumber(
                              proposal.bedrooms
                            )}
                          />

                          <SummaryItem
                            label="Banheiros"
                            value={formatNumber(
                              proposal.bathrooms
                            )}
                          />
                        </div>

                        <div className="mt-7 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:flex-wrap">
                          <Link
                            href={`/admin/propostas/${proposal.id}`}
                            style={{
                              color: "#ffffff",
                            }}
                            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-center font-bold shadow-sm transition hover:bg-blue-900"
                          >
                            Ver proposta completa
                          </Link>

                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "#ffffff",
                              }}
                              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-green-600 px-5 py-3 text-center font-bold shadow-sm transition hover:bg-green-700"
                            >
                              WhatsApp
                            </a>
                          )}

                          {proposal.owner_email && (
                            <a
                              href={`mailto:${proposal.owner_email}`}
                              style={{
                                color: "#172554",
                              }}
                              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-blue-950 px-5 py-3 text-center font-bold transition hover:bg-blue-50"
                            >
                              E-mail
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

type StatusSummaryProps = {
  label: string;
  value: number;
  className: string;
  href: string;
  active: boolean;
};

function StatusSummary({
  label,
  value,
  className,
  href,
  active,
}: StatusSummaryProps) {
  return (
    <Link
      href={href}
      aria-current={
        active
          ? "page"
          : undefined
      }
      className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${className} ${
        active
          ? "ring-2 ring-blue-950 ring-offset-2"
          : ""
      }`}
    >
      <p className="text-sm font-bold uppercase tracking-wider">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black">
        {value}
      </p>
    </Link>
  );
}

type InfoItemProps = {
  label: string;
  value: string;
};

function InfoItem({
  label,
  value,
}: InfoItemProps) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

type SummaryItemProps = {
  label: string;
  value: string;
};

function SummaryItem({
  label,
  value,
}: SummaryItemProps) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-4 text-center">
      <p className="text-xl font-black text-blue-950">
        {value}
      </p>

      <p className="mt-1 text-xs font-semibold text-slate-500">
        {label}
      </p>
    </div>
  );
}