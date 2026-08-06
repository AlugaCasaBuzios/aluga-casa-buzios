import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type ArchivedProposalsPageProps = {
  searchParams: Promise<{
    busca?: string;
    ordem?: string;
    restaurado?: string;
  }>;
};

type SortOrder =
  | "newest"
  | "oldest";

const sortOrders: SortOrder[] = [
  "newest",
  "oldest",
];

type ProposalRecord = {
  id: string;
  created_at: string;
  archived_at: string;

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
    "Olá! Estamos revisando sua proposta de imóvel enviada para a Aluga Casa Búzios.";

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

export default async function ArchivedProposalsPage({
  searchParams,
}: ArchivedProposalsPageProps) {
  const {
    busca,
    ordem,
    restaurado,
  } = await searchParams;

  const searchTerm =
    (busca ?? "")
      .trim()
      .slice(0, 100);

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
      archived_at,
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
    .not(
      "archived_at",
      "is",
      null
    )
    .order("archived_at", {
      ascending: false,
    })
    .limit(200);

  if (error) {
    console.error(
      "Erro ao carregar propostas arquivadas:",
      error
    );

    return (
      <main className="min-h-screen bg-slate-100 px-4 py-12">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-red-700">
            Não foi possível carregar as propostas arquivadas
          </h1>

          <p className="mt-3 text-slate-600">
            Ocorreu um erro ao consultar as propostas no Supabase.
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
            first.archived_at
          ).getTime();

        const secondTime =
          new Date(
            second.archived_at
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
    selectedSortOrder !==
      "newest";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl bg-amber-900 p-7 text-white shadow-lg sm:p-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-amber-200">
                Aluga Casa Búzios
              </p>

              <h1 className="mt-2 text-3xl font-black">
                Propostas arquivadas
              </h1>

              <p className="mt-3 text-amber-100">
                Consulte propostas removidas da lista principal sem perder
                os dados, as fotos ou o andamento registrado.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin/propostas"
                style={{
                  color: "#78350f",
                }}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-100 px-6 py-3 font-bold shadow-sm transition hover:bg-amber-200"
              >
                Ver propostas ativas
              </Link>

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
          </div>
        </header>

        {restaurado === "1" && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-800"
          >
            Proposta restaurada com sucesso. Ela voltou para a lista de
            propostas ativas.
          </div>
        )}

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-lg">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Pesquisar e ordenar
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Encontre uma proposta arquivada pelo proprietário, imóvel,
              bairro, telefone ou e-mail.
            </p>
          </div>

          <form
            action="/admin/propostas/arquivadas"
            method="get"
            className="mt-6 grid gap-4 lg:grid-cols-4"
          >
            <div className="lg:col-span-3">
              <label
                htmlFor="archived-proposal-search"
                className="text-sm font-bold text-slate-700"
              >
                Pesquisa
              </label>

              <input
                id="archived-proposal-search"
                name="busca"
                type="search"
                defaultValue={searchTerm}
                maxLength={100}
                placeholder="Ex.: João, Centro, casa ou telefone"
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
              />
            </div>

            <div>
              <label
                htmlFor="archived-proposal-order"
                className="text-sm font-bold text-slate-700"
              >
                Ordenação
              </label>

              <select
                id="archived-proposal-order"
                name="ordem"
                defaultValue={selectedSortOrder}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
              >
                <option value="newest">
                  Arquivadas recentemente
                </option>

                <option value="oldest">
                  Arquivadas há mais tempo
                </option>
              </select>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:col-span-4 lg:justify-end">
              {filtersAreActive && (
                <Link
                  href="/admin/propostas/arquivadas"
                  style={{
                    color: "#78350f",
                  }}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-amber-800 px-6 py-3 font-bold transition hover:bg-amber-50"
                >
                  Limpar filtros
                </Link>
              )}

              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-800 px-7 py-3 font-bold text-white shadow-sm transition hover:bg-amber-900"
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
                Arquivo de propostas
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
                      ? "proposta arquivada"
                      : "propostas arquivadas"}
                  </>
                ) : (
                  <>
                    {allProposals.length}{" "}
                    {allProposals.length === 1
                      ? "proposta arquivada"
                      : "propostas arquivadas"}
                  </>
                )}
              </p>
            </div>

            <p className="text-sm text-slate-500">
              {selectedSortOrder ===
              "oldest"
                ? "Arquivadas há mais tempo primeiro"
                : "Arquivadas recentemente primeiro"}
            </p>
          </div>

          {proposals.length === 0 ? (
            <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-lg">
              <div
                aria-hidden="true"
                className="text-5xl"
              >
                🗃️
              </div>

              <h2 className="mt-5 text-2xl font-bold text-slate-900">
                {allProposals.length === 0
                  ? "Nenhuma proposta arquivada"
                  : "Nenhuma proposta encontrada"}
              </h2>

              <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">
                {allProposals.length === 0
                  ? "As propostas arquivadas aparecerão aqui e poderão ser restauradas posteriormente."
                  : "Não encontramos propostas arquivadas com a pesquisa informada."}
              </p>

              {filtersAreActive && (
                <Link
                  href="/admin/propostas/arquivadas"
                  style={{
                    color: "#ffffff",
                  }}
                  className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-800 px-6 py-3 font-bold transition hover:bg-amber-900"
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
                      className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-lg"
                    >
                      <div className="border-b border-amber-200 bg-amber-50 px-6 py-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-wider text-amber-800">
                              {formatPropertyType(
                                proposal.property_type
                              )}
                            </p>

                            <h2 className="mt-2 text-2xl font-bold text-blue-950">
                              {proposal.property_name ||
                                "Imóvel sem nome"}
                            </h2>

                            <p className="mt-2 text-sm font-semibold text-amber-900">
                              Arquivada em{" "}
                              {formatDateTime(
                                proposal.archived_at
                              )}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
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
                              {statusInformation.label}
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
                            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-amber-800 px-5 py-3 text-center font-bold shadow-sm transition hover:bg-amber-900"
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
                                color: "#78350f",
                              }}
                              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-amber-800 px-5 py-3 text-center font-bold transition hover:bg-amber-50"
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