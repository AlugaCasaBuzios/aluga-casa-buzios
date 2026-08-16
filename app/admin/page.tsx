import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

import { logout } from "./actions";
import AdminPropertyTable from "@/components/admin/AdminPropertyTable";

import {
  getPropertyPublicationChecklist,
} from "@/lib/propertyPublicationChecklist";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams: Promise<{
    salvo?: string;
    erro?: string;
    status?: string;
  }>;
};

type PropertyPricing = {
  property_id: string;
  property_name: string;
  base_price: number;
  cleaning_fee: number | null;
  minimum_nights: number | null;
  minimum_price: number | null;
  maximum_price: number | null;
  active: boolean;
};

type PropertyCatalogRow = {
  id: string;
  title: string;
  neighborhood: string;
  description: string;
  image: string;
  gallery: string[] | null;
  guests: number;
  bedrooms: number;
  bathrooms: number;
  beds: number;
  amenities: string[] | null;
  whatsapp: string;
  latitude: number | null;
  longitude: number | null;
  featured: boolean;
  display_order: number;
};

type PendingReportRow = {
  id: string;
  amount_due_to_manager:
    | number
    | string;
};

type ReportPaymentRow = {
  report_id: string;
  amount: number | string;
};

function formatCurrency(
  value: number | null
): string {
  if (value === null) {
    return "Não definido";
  }

  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(value);
}

function getErrorMessage(
  error?: string
): string | null {
  switch (error) {
    case "imovel":
      return "Não foi possível identificar o imóvel.";

    case "status":
      return "Não foi possível alterar o status do imóvel.";

    case "exclusao-confirmacao":
      return "A confirmação da exclusão não foi preenchida corretamente.";

    case "exclusao-ativo":
      return "Desative o imóvel antes de realizar a exclusão definitiva.";

    case "exclusao-nao-encontrado":
      return "O imóvel não foi encontrado ou já foi excluído.";

    case "exclusao":
      return "Não foi possível excluir o imóvel. Nenhuma nova tentativa deve ser feita até verificar os dados no Supabase.";

    default:
      return null;
  }
}

export default async function AdminPage({
  searchParams,
}: AdminPageProps) {
  const {
    salvo,
    erro,
    status,
  } = await searchParams;

  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const adminSupabase =
    createSupabaseAdminClient();

  const [
    pricingResult,
    catalogResult,
    newProposalsResult,
    archivedProposalsResult,
    pendingReportsResult,
  ] = await Promise.all([
    supabase
      .from("property_pricing")
      .select(`
        property_id,
        property_name,
        base_price,
        cleaning_fee,
        minimum_nights,
        minimum_price,
        maximum_price,
        active
      `)
      .order("property_name", {
        ascending: true,
      }),

    adminSupabase
      .from("property_catalog")
      .select(`
        id,
        title,
        neighborhood,
        description,
        image,
        gallery,
        guests,
        bedrooms,
        bathrooms,
        beds,
        amenities,
        whatsapp,
        latitude,
        longitude,
        featured,
        display_order
      `),

    adminSupabase
      .from(
        "property_management_leads"
      )
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "new")
      .is("archived_at", null),

    adminSupabase
      .from(
        "property_management_leads"
      )
      .select("id", {
        count: "exact",
        head: true,
      })
      .not(
        "archived_at",
        "is",
        null
      ),

    adminSupabase
      .from("owner_reports")
      .select(`
        id,
        amount_due_to_manager
      `)
      .in("status", [
        "closed",
        "sent",
      ])
      .in("payment_status", [
        "pending",
        "partial",
      ]),
  ]);

  const {
    data,
    error,
  } = pricingResult;

  const {
    data: catalogData,
    error: catalogError,
  } = catalogResult;

  const {
    count: newProposalsCount,
    error: proposalsCountError,
  } = newProposalsResult;

  const {
    count: archivedProposalsCount,
    error: archivedProposalsCountError,
  } = archivedProposalsResult;

  const {
    data: pendingReportsData,
    error: pendingReportsError,
  } = pendingReportsResult;

  let pendingSummaryError =
    Boolean(pendingReportsError);

  if (catalogError) {
    console.error(
      "Erro ao carregar o catálogo dos imóveis:",
      catalogError
    );
  }

  if (proposalsCountError) {
    console.error(
      "Erro ao contar propostas novas:",
      proposalsCountError
    );
  }

  if (
    archivedProposalsCountError
  ) {
    console.error(
      "Erro ao contar propostas arquivadas:",
      archivedProposalsCountError
    );
  }

  if (pendingReportsError) {
    console.error(
      "Erro ao carregar cobranças pendentes:",
      pendingReportsError
    );
  }

  const newProposals =
    newProposalsCount ?? 0;

  const archivedProposals =
    archivedProposalsCount ?? 0;

  const pendingReportRows =
    (pendingReportsData ?? []) as
      PendingReportRow[];

  const pendingReportIds =
    pendingReportRows.map(
      (report) => report.id
    );

  let reportPayments:
    ReportPaymentRow[] = [];

  if (
    pendingReportIds.length > 0
  ) {
    const {
      data: paymentsData,
      error: paymentsError,
    } = await adminSupabase
      .from(
        "owner_report_payments"
      )
      .select("report_id, amount")
      .in(
        "report_id",
        pendingReportIds
      );

    if (paymentsError) {
      pendingSummaryError = true;

      console.error(
        "Erro ao calcular pagamentos pendentes:",
        paymentsError
      );
    } else {
      reportPayments =
        (paymentsData ?? []) as
          ReportPaymentRow[];
    }
  }

  const amountPaidByReport =
    new Map<string, number>();

  for (
    const payment of
    reportPayments
  ) {
    const currentAmount =
      amountPaidByReport.get(
        payment.report_id
      ) ?? 0;

    amountPaidByReport.set(
      payment.report_id,
      currentAmount +
        Number(payment.amount ?? 0)
    );
  }

  const pendingBalances =
    pendingReportRows
      .map((report) => {
        const amountDue =
          Number(
            report.amount_due_to_manager ??
              0
          );

        const amountPaid =
          amountPaidByReport.get(
            report.id
          ) ?? 0;

        return Math.max(
          0,
          amountDue - amountPaid
        );
      })
      .filter(
        (balance) => balance > 0
      );

  const pendingReportsCount =
    pendingBalances.length;

  const pendingReportsTotal =
    Math.round(
      pendingBalances.reduce(
        (total, balance) =>
          total + balance,
        0
      ) * 100
    ) / 100;

  if (error) {
    console.error(
      "Erro ao carregar os imóveis:",
      error
    );

    return (
      <main className="min-h-screen bg-slate-100 px-4 py-12">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-red-700">
            Não foi possível carregar os imóveis
          </h1>

          <p className="mt-3 text-slate-600">
            Verifique as permissões da tabela
            property_pricing no Supabase.
          </p>

          <Link
            href="/admin"
            className="mt-6 inline-flex rounded-xl bg-blue-950 px-5 py-3 font-bold text-white transition hover:bg-blue-900"
          >
            Tentar novamente
          </Link>
        </div>
      </main>
    );
  }

  const properties =
    (data ?? []) as PropertyPricing[];

  const catalogById = new Map(
    (
      (catalogData ?? []) as PropertyCatalogRow[]
    ).map((property) => [
      property.id,
      property,
    ])
  );

  const propertyRows = properties.map(
    (property) => {
      const catalog =
        catalogById.get(
          property.property_id
        );

      const checklist = catalog
        ? getPropertyPublicationChecklist({
            title: catalog.title,
            neighborhood:
              catalog.neighborhood,
            description:
              catalog.description,
            image: catalog.image,
            gallery: catalog.gallery,
            guests: catalog.guests,
            bedrooms: catalog.bedrooms,
            bathrooms:
              catalog.bathrooms,
            beds: catalog.beds,
            amenities:
              catalog.amenities,
            whatsapp:
              catalog.whatsapp,
            latitude:
              catalog.latitude,
            longitude:
              catalog.longitude,
            basePrice:
              property.base_price,
            minimumNights:
              property.minimum_nights,
          })
        : null;

      return {
        ...property,
        neighborhood:
          catalog?.neighborhood ?? "",
        image:
          catalog?.image ?? "",
        publicationReady:
          checklist?.ready ?? false,
        publicationProgress:
          checklist
            ? Math.round(
                (
                  checklist.completeCount /
                  checklist.totalCount
                ) * 100
              )
            : 0,
        featured:
          catalog?.featured ?? false,
        displayOrder:
          catalog?.display_order ??
          Number.MAX_SAFE_INTEGER,
      };
    }
  ).sort((a, b) => {
    if (
      a.displayOrder !==
      b.displayOrder
    ) {
      return (
        a.displayOrder -
        b.displayOrder
      );
    }

    return a.property_name.localeCompare(
      b.property_name,
      "pt-BR"
    );
  });

  const errorMessage =
    getErrorMessage(erro);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-3xl bg-blue-950 p-8 text-white shadow-lg">
          <div className="flex flex-col gap-7">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                Aluga Casa Búzios
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Painel administrativo
              </h1>

              <p className="mt-2 text-blue-100">
                Gerenciamento de preços, períodos,
                disponibilidade, imóveis, propostas e passeios 360°
              </p>
            </div>

            <nav
              aria-label="Opções do painel administrativo"
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
            >
              <Link
                href="/admin/propostas"
                style={{
                  color: "#172554",
                }}
                aria-label={
                  newProposals > 0
                    ? `Propostas de imóveis: ${newProposals} novas`
                    : "Propostas de imóveis"
                }
                className="relative inline-flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl bg-sky-300 px-5 py-3 text-center font-bold text-blue-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-200"
              >
                <span>
                  Propostas de imóveis
                </span>

                {newProposals > 0 && (
                  <span className="inline-flex rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white shadow-sm">
                    {newProposals}{" "}
                    {newProposals === 1
                      ? "nova"
                      : "novas"}
                  </span>
                )}
              </Link>

              <Link
                href="/admin/propostas/arquivadas"
                style={{
                  color: "#78350f",
                }}
                aria-label={
                  archivedProposals === 1
                    ? "1 proposta arquivada"
                    : `${archivedProposals} propostas arquivadas`
                }
                className="relative inline-flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl bg-amber-100 px-5 py-3 text-center font-bold text-amber-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-200"
              >
                <span>
                  Propostas arquivadas
                </span>

                <span className="inline-flex rounded-full bg-amber-700 px-3 py-1 text-xs font-black text-white shadow-sm">
                  {archivedProposals}{" "}
                  {archivedProposals === 1
                    ? "arquivada"
                    : "arquivadas"}
                </span>
              </Link>

              <Link
                href="/admin/bloqueios"
                style={{
                  color: "#172554",
                }}
                className="inline-flex min-h-16 items-center justify-center rounded-xl bg-white px-5 py-3 text-center font-bold text-blue-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100"
              >
                Bloqueios manuais
              </Link>

              <Link
                href="/admin/precos-por-data"
                style={{
                  color: "#172554",
                }}
                className="inline-flex min-h-16 items-center justify-center rounded-xl bg-white px-5 py-3 text-center font-bold text-blue-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100"
              >
                Preços por data
              </Link>

              <Link
                href="/admin/periodos"
                style={{
                  color: "#172554",
                }}
                className="inline-flex min-h-16 items-center justify-center rounded-xl bg-white px-5 py-3 text-center font-bold text-blue-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100"
              >
                Períodos especiais
              </Link>

              <Link
                href="/admin/manutencao"
                style={{
                  color: "#14532d",
                }}
                className="inline-flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl bg-emerald-100 px-5 py-3 text-center font-bold text-green-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-200"
              >
                <span>Manutenção</span>
                <span className="text-xs font-semibold text-green-700">Equipe e chamados</span>
              </Link>

              <Link
                href="/admin/relatorios"
                style={{
                  color: "#164e63",
                }}
                className="inline-flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl bg-cyan-100 px-5 py-3 text-center font-bold text-cyan-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-200"
              >
                <span>Relatórios</span>
                <span className="text-xs font-semibold text-cyan-800">Proprietários e financeiro</span>
              </Link>

              <Link
                href="/admin/funcionarios"
                style={{
                  color: "#312e81",
                }}
                className="inline-flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl bg-indigo-100 px-5 py-3 text-center font-bold text-indigo-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-200"
              >
                <span>Funcionários</span>
                <span className="text-xs font-semibold text-indigo-700">Acessos da equipe</span>
              </Link>

              <Link
                href="/admin/tours"
                style={{
                  color: "#172554",
                }}
                className="inline-flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl bg-sky-100 px-5 py-3 text-center font-bold text-blue-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-200"
              >
                <span>Passeios 360°</span>
                <span className="text-xs font-semibold text-sky-800">Ambientes e publicação</span>
              </Link>

              <Link
                href="/admin/clientes-tours"
                style={{
                  color: "#14532d",
                }}
                className="inline-flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl bg-lime-100 px-5 py-3 text-center font-bold text-green-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-lime-200"
              >
                <span>Clientes dos tours</span>
                <span className="text-xs font-semibold text-green-800">Contratos e cobranças</span>
              </Link>

              <Link
                href="/admin/atendimento-ia"
                style={{
                  color: "#4c1d95",
                }}
                className="inline-flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl bg-violet-100 px-5 py-3 text-center font-bold text-violet-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-200"
              >
                <span>WhatsApp com IA</span>
                <span className="text-xs font-semibold text-violet-800">
                  Conhecimento e atendimento
                </span>
              </Link>
            </nav>

            <div className="flex justify-end">
              <form action={logout}>
                <button
                  type="submit"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3 font-bold text-white transition hover:bg-white hover:text-blue-950"
                >
                  Sair do painel
                </button>
              </form>
            </div>
          </div>
        </header>

        <section
          className={`mb-8 rounded-3xl border p-6 shadow-sm ${
            pendingSummaryError
              ? "border-amber-200 bg-amber-50"
              : pendingReportsCount > 0
              ? "border-red-200 bg-red-50"
              : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p
                className={`text-sm font-bold uppercase tracking-widest ${
                  pendingSummaryError
                    ? "text-amber-800"
                    : pendingReportsCount > 0
                    ? "text-red-700"
                    : "text-emerald-700"
                }`}
              >
                Financeiro dos proprietários
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {pendingSummaryError
                  ? "Resumo financeiro indisponível"
                  : pendingReportsCount > 0
                  ? `${pendingReportsCount} ${
                      pendingReportsCount ===
                      1
                        ? "cobrança pendente"
                        : "cobranças pendentes"
                    }`
                  : "Nenhuma cobrança pendente"}
              </h2>

              <p className="mt-2 text-slate-700">
                {pendingSummaryError
                  ? "Abra a tela de cobranças e atualize a página antes de usar os valores."
                  : pendingReportsCount > 0
                  ? "Comissões e despesas aguardando pagamento dos proprietários."
                  : "Todos os relatórios fechados estão pagos."}
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="rounded-2xl bg-white px-6 py-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Saldo pendente
                </p>

                <p
                  className={`mt-1 text-2xl font-black ${
                    pendingSummaryError
                      ? "text-amber-800"
                      : pendingReportsCount > 0
                      ? "text-red-700"
                      : "text-emerald-700"
                  }`}
                >
                  {pendingSummaryError
                    ? "—"
                    : formatCurrency(
                        pendingReportsTotal
                      )}
                </p>
              </div>

              <Link
                href="/admin/relatorios/pendencias"
                style={{
                  color: "#ffffff",
                }}
                className="inline-flex min-h-14 items-center justify-center rounded-xl bg-blue-950 px-6 py-4 text-center font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-900"
              >
                Ver cobranças
              </Link>
            </div>
          </div>
        </section>

        {salvo === "1" && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-800"
          >
            Alterações salvas com sucesso.
          </div>
        )}

        {status === "desativado" && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900"
          >
            Imóvel desativado com sucesso.
          </div>
        )}

        {status === "reativado" && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-800"
          >
            Imóvel reativado com sucesso.
          </div>
        )}

        {status === "excluido" && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-800"
          >
            Imóvel, preços e fotos excluídos definitivamente.
          </div>
        )}

        {status === "excluido-limpeza" && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900"
          >
            O imóvel e os preços foram excluídos, mas algumas fotos podem ter permanecido no armazenamento. Verifique a pasta do imóvel no Storage do Supabase.
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800"
          >
            {errorMessage}
          </div>
        )}

        <AdminPropertyTable
          properties={propertyRows}
        />
      </div>
    </main>
  );
}
