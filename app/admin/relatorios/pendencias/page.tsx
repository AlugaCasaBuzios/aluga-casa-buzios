import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type OwnerReportRow = {
  id: string;
  property_id: string;
  owner_id: string | null;
  period_start: string;
  period_end: string;
  status: "closed" | "sent";
  payment_status: "pending" | "partial" | "paid" | "not_due" | "cancelled";
  amount_due_to_manager: number | string;
  created_at: string;
};

type OwnerReportPaymentRow = {
  report_id: string;
  amount: number | string;
};

type PropertyRow = {
  id: string;
  title: string;
};

type OwnerLinkRow = {
  property_id: string;
  owner_id: string;
};

type OwnerRow = {
  id: string;
  full_name: string;
};

type PendingReport = {
  id: string;
  propertyId: string;
  propertyName: string;
  ownerName: string;
  periodStart: string;
  periodEnd: string;
  status: "closed" | "sent";
  amountDue: number;
  amountPaid: number;
  remainingAmount: number;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export default async function PendingReportsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("management_users")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile?.active || profile.role !== "admin") {
    redirect("/equipe/manutencao");
  }

  const adminSupabase = createSupabaseAdminClient();

  const { data: reportsData, error: reportsError } = await adminSupabase
    .from("owner_reports")
    .select(`
      id,
      property_id,
      owner_id,
      period_start,
      period_end,
      status,
      payment_status,
      amount_due_to_manager,
      created_at
    `)
    .in("status", ["closed", "sent"])
    .in("payment_status", ["pending", "partial"])
    .order("period_end", { ascending: true })
    .order("created_at", { ascending: true });

  if (reportsError) {
    console.error("Erro ao carregar cobranças pendentes:", reportsError);

    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-red-700">
            Não foi possível carregar as cobranças pendentes
          </h1>

          <p className="mt-3 text-slate-600">
            Atualize a página. Se o problema continuar, verifique a conexão com o Supabase.
          </p>

          <Link
            href="/admin/relatorios"
            style={{ color: "#ffffff" }}
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 font-bold text-white"
          >
            Voltar aos relatórios
          </Link>
        </div>
      </main>
    );
  }

  const reports = (reportsData ?? []) as OwnerReportRow[];
  const reportIds = reports.map((report) => report.id);

  const [paymentsResult, propertiesResult, linksResult, ownersResult] =
    await Promise.all([
      reportIds.length > 0
        ? adminSupabase
            .from("owner_report_payments")
            .select("report_id, amount")
            .in("report_id", reportIds)
        : Promise.resolve({ data: [], error: null }),
      adminSupabase.from("property_catalog").select("id, title"),
      adminSupabase
        .from("property_owner_links")
        .select("property_id, owner_id")
        .eq("is_primary", true),
      adminSupabase.from("property_owners").select("id, full_name"),
    ]);

  const loadError =
    paymentsResult.error ||
    propertiesResult.error ||
    linksResult.error ||
    ownersResult.error;

  if (loadError) {
    console.error("Erro ao complementar cobranças pendentes:", loadError);
  }

  const payments = (paymentsResult.data ?? []) as OwnerReportPaymentRow[];
  const properties = (propertiesResult.data ?? []) as PropertyRow[];
  const ownerLinks = (linksResult.data ?? []) as OwnerLinkRow[];
  const owners = (ownersResult.data ?? []) as OwnerRow[];

  const amountPaidByReport = new Map<string, number>();

  for (const payment of payments) {
    amountPaidByReport.set(
      payment.report_id,
      roundMoney(
        (amountPaidByReport.get(payment.report_id) ?? 0) +
          Number(payment.amount ?? 0)
      )
    );
  }

  const propertyNameById = new Map(
    properties.map((property) => [property.id, property.title])
  );

  const currentOwnerIdByProperty = new Map(
    ownerLinks.map((link) => [link.property_id, link.owner_id])
  );

  const ownerNameById = new Map(
    owners.map((owner) => [owner.id, owner.full_name])
  );

  const pendingReports: PendingReport[] = reports
    .map((report) => {
      const amountDue = roundMoney(
        Number(report.amount_due_to_manager ?? 0)
      );
      const amountPaid = roundMoney(
        amountPaidByReport.get(report.id) ?? 0
      );
      const remainingAmount = roundMoney(
        Math.max(0, amountDue - amountPaid)
      );
      const currentOwnerId =
        currentOwnerIdByProperty.get(report.property_id) ?? report.owner_id;

      return {
        id: report.id,
        propertyId: report.property_id,
        propertyName:
          propertyNameById.get(report.property_id) ?? report.property_id,
        ownerName:
          (currentOwnerId
            ? ownerNameById.get(currentOwnerId)
            : null) ?? "Proprietário não informado",
        periodStart: report.period_start,
        periodEnd: report.period_end,
        status: report.status,
        amountDue,
        amountPaid,
        remainingAmount,
      };
    })
    .filter((report) => report.remainingAmount > 0)
    .sort((first, second) =>
      first.periodEnd.localeCompare(second.periodEnd)
    );

  const totalDue = roundMoney(
    pendingReports.reduce((total, report) => total + report.amountDue, 0)
  );
  const totalPaid = roundMoney(
    pendingReports.reduce((total, report) => total + report.amountPaid, 0)
  );
  const totalPending = roundMoney(
    pendingReports.reduce(
      (total, report) => total + report.remainingAmount,
      0
    )
  );
  const ownersWithPendingReports = new Set(
    pendingReports.map((report) => report.ownerName)
  ).size;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-blue-950 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                Aluga Casa Búzios
              </p>
              <h1 className="mt-2 text-3xl font-bold">
                Cobranças pendentes
              </h1>
              <p className="mt-2 max-w-3xl text-blue-100">
                Acompanhe comissões e despesas que ainda precisam ser pagas pelos proprietários.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin/relatorios"
                style={{ color: "#172554" }}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-sky-200 px-5 py-3 font-bold text-blue-950 transition hover:bg-sky-100"
              >
                Relatórios
              </Link>

              <Link
                href="/admin"
                style={{ color: "#172554" }}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 font-bold text-blue-950 transition hover:bg-blue-100"
              >
                Voltar ao painel
              </Link>
            </div>
          </div>
        </header>

        {loadError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 font-semibold text-amber-900">
            Parte dos dados complementares não pôde ser carregada. Atualize a página antes de realizar uma cobrança.
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Saldo total pendente"
            value={formatCurrency(totalPending)}
            detail={`${pendingReports.length} relatório(s) em aberto`}
            color="red"
          />
          <SummaryCard
            label="Total devido"
            value={formatCurrency(totalDue)}
            detail="Comissões e despesas dos relatórios"
            color="blue"
          />
          <SummaryCard
            label="Total já pago"
            value={formatCurrency(totalPaid)}
            detail="Pagamentos parciais registrados"
            color="green"
          />
          <SummaryCard
            label="Proprietários pendentes"
            value={String(ownersWithPendingReports)}
            detail="Com pelo menos uma cobrança em aberto"
            color="amber"
          />
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-lg">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-bold text-slate-900">
              Relatórios aguardando pagamento
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Os períodos mais antigos aparecem primeiro para facilitar a cobrança.
            </p>
          </div>

          {pendingReports.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
                ✓
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">
                Nenhuma cobrança pendente
              </h3>
              <p className="mt-2 text-slate-600">
                Todos os relatórios fechados estão pagos.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-5 py-4">Proprietário e imóvel</th>
                      <th className="px-5 py-4">Período</th>
                      <th className="px-5 py-4">Total devido</th>
                      <th className="px-5 py-4">Total pago</th>
                      <th className="px-5 py-4">Saldo pendente</th>
                      <th className="px-5 py-4">Situação</th>
                      <th className="px-5 py-4">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pendingReports.map((report) => (
                      <tr key={report.id} className="text-slate-700">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">
                            {report.ownerName}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {report.propertyName}
                          </p>
                        </td>
                        <td className="px-5 py-4 font-semibold">
                          {formatDate(report.periodStart)} a{" "}
                          {formatDate(report.periodEnd)}
                        </td>
                        <td className="px-5 py-4 font-bold text-blue-950">
                          {formatCurrency(report.amountDue)}
                        </td>
                        <td className="px-5 py-4 font-bold text-emerald-700">
                          {formatCurrency(report.amountPaid)}
                        </td>
                        <td className="px-5 py-4 text-lg font-black text-red-700">
                          {formatCurrency(report.remainingAmount)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                              report.amountPaid > 0
                                ? "bg-sky-100 text-sky-900"
                                : "bg-red-100 text-red-900"
                            }`}
                          >
                            {report.amountPaid > 0
                              ? "Pago parcialmente"
                              : "Pagamento pendente"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <OpenReportLink report={report} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 p-4 lg:hidden">
                {pendingReports.map((report) => (
                  <article
                    key={report.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          {report.ownerName}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {report.propertyName}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          report.amountPaid > 0
                            ? "bg-sky-100 text-sky-900"
                            : "bg-red-100 text-red-900"
                        }`}
                      >
                        {report.amountPaid > 0 ? "Parcial" : "Pendente"}
                      </span>
                    </div>

                    <p className="mt-4 text-sm font-semibold text-slate-600">
                      {formatDate(report.periodStart)} a{" "}
                      {formatDate(report.periodEnd)}
                    </p>

                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-4 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Devido</p>
                        <p className="mt-1 font-bold text-blue-950">
                          {formatCurrency(report.amountDue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Pago</p>
                        <p className="mt-1 font-bold text-emerald-700">
                          {formatCurrency(report.amountPaid)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Saldo</p>
                        <p className="mt-1 font-black text-red-700">
                          {formatCurrency(report.remainingAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <OpenReportLink report={report} fullWidth />
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  detail: string;
  color: "red" | "blue" | "green" | "amber";
};

function SummaryCard({ label, value, detail, color }: SummaryCardProps) {
  const colorClass = {
    red: "text-red-700",
    blue: "text-blue-950",
    green: "text-emerald-700",
    amber: "text-amber-700",
  }[color];

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-black ${colorClass}`}>{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

type OpenReportLinkProps = {
  report: PendingReport;
  fullWidth?: boolean;
};

function OpenReportLink({ report, fullWidth = false }: OpenReportLinkProps) {
  const href =
    `/admin/relatorios?imovel=${encodeURIComponent(report.propertyId)}` +
    `&inicio=${encodeURIComponent(report.periodStart)}` +
    `&fim=${encodeURIComponent(report.periodEnd)}`;

  return (
    <Link
      href={href}
      style={{ color: "#ffffff" }}
      className={`inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-950 px-4 py-2 font-bold text-white transition hover:bg-blue-900 ${
        fullWidth ? "w-full" : ""
      }`}
    >
      Abrir cobrança
    </Link>
  );
}
