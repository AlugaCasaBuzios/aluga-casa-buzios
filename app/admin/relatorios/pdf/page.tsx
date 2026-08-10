import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  calculateOwnerReportFinancial,
  getServicePlanLabel,
  isCleaningCategory,
  isServicePlan,
  resolveCommissionPercentage,
  type ServicePlan,
} from "@/lib/ownerReportFinancial";

import PrintActions from "./PrintActions";

export const dynamic = "force-dynamic";

type PdfPageProps = {
  searchParams: Promise<{
    imovel?: string;
    inicio?: string;
    fim?: string;
  }>;
};

type PropertyRow = {
  id: string;
  title: string;
};

type OwnerRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
};

type OwnerLinkRow = {
  owner_id: string;
  service_plan: string;
  commission_percentage: number | string;
};

type FinancialEntry = {
  id: string;
  entry_date: string;
  entry_type: "revenue" | "expense";
  category: string;
  channel: string | null;
  description: string;
  amount: number | string;
  deduct_from_owner: boolean;
  reservation_reference: string | null;
  maintenance_ticket_id: string | null;
};

type SavedReport = {
  id: string;
  status: "draft" | "closed" | "sent";
  service_plan: string;
  commission_percentage: number | string;
  gross_revenue: number | string;
  cleaning_total: number | string;
  commission_base: number | string;
  commission_amount: number | string;
  deductible_expenses: number | string;
  reimbursable_expenses: number | string;
  amount_due_to_manager: number | string;
  net_owner_amount: number | string;
  payment_status: "not_due" | "pending" | "partial" | "paid" | "cancelled";
  notes: string | null;
  generated_at: string | null;
  sent_at: string | null;
  created_at: string;
};

type ReportPayment = {
  id: string;
  payment_date: string;
  amount: number | string;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  attachment_path: string | null;
};

type PendingMaintenance = {
  id: string;
  ticket_number: string;
  category: string;
  problem: string;
  final_cost: number | string | null;
};

function isDateOnly(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
}

function formatCurrency(value: number | string | null | undefined): string {
  const numericValue = Number(value ?? 0);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const dateOnly = value.slice(0, 10);
  const [year, month, day] = dateOnly.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getStatusLabel(status?: SavedReport["status"]): string {
  if (status === "closed") {
    return "Fechado";
  }

  if (status === "sent") {
    return "Enviado";
  }

  if (status === "draft") {
    return "Rascunho";
  }

  return "Prévia";
}

function getPaymentStatusLabel(
  status?: SavedReport["payment_status"]
): string {
  switch (status) {
    case "pending":
      return "Pagamento pendente";
    case "partial":
      return "Pago parcialmente";
    case "paid":
      return "Pago";
    case "cancelled":
      return "Cancelado";
    case "not_due":
      return "Ainda não devido";
    default:
      return "Prévia financeira";
  }
}

function getPaymentMethodLabel(value: string | null): string {
  switch (value) {
    case "pix":
      return "Pix";
    case "transfer":
      return "Transferência bancária";
    case "cash":
      return "Dinheiro";
    case "card":
      return "Cartão";
    case "other":
      return "Outro";
    default:
      return value || "Forma não informada";
  }
}

function safeFileName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export default async function OwnerReportPdfPage({ searchParams }: PdfPageProps) {
  const params = await searchParams;
  const propertyId = params.imovel ?? "";
  const periodStart = params.inicio ?? "";
  const periodEnd = params.fim ?? "";

  if (
    !propertyId ||
    !isDateOnly(periodStart) ||
    !isDateOnly(periodEnd) ||
    periodEnd < periodStart
  ) {
    redirect("/admin/relatorios");
  }

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

  const { data: propertyData, error: propertyError } = await adminSupabase
    .from("property_catalog")
    .select("id, title")
    .eq("id", propertyId)
    .maybeSingle();

  if (propertyError || !propertyData) {
    redirect("/admin/relatorios");
  }

  const property = propertyData as PropertyRow;

  const [ownerLinkResult, entriesResult, reportResult, maintenanceResult] =
    await Promise.all([
      adminSupabase
        .from("property_owner_links")
        .select("owner_id, service_plan, commission_percentage")
        .eq("property_id", propertyId)
        .eq("is_primary", true)
        .limit(1)
        .maybeSingle(),
      adminSupabase
        .from("property_financial_entries")
        .select(`
          id,
          entry_date,
          entry_type,
          category,
          channel,
          description,
          amount,
          deduct_from_owner,
          reservation_reference,
          maintenance_ticket_id
        `)
        .eq("property_id", propertyId)
        .gte("entry_date", periodStart)
        .lte("entry_date", periodEnd)
        .order("entry_date", { ascending: true }),
      adminSupabase
        .from("owner_reports")
        .select(`
          id,
          status,
          service_plan,
          commission_percentage,
          gross_revenue,
          cleaning_total,
          commission_base,
          commission_amount,
          deductible_expenses,
          reimbursable_expenses,
          amount_due_to_manager,
          net_owner_amount,
          payment_status,
          notes,
          generated_at,
          sent_at,
          created_at
        `)
        .eq("property_id", propertyId)
        .eq("period_start", periodStart)
        .eq("period_end", periodEnd)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      adminSupabase
        .from("maintenance_tickets")
        .select("id, ticket_number, category, problem, final_cost")
        .eq("property_id", propertyId)
        .eq("status", "Concluído")
        .eq("charge_owner", true)
        .eq("posted_to_financial", false)
        .gte("completed_at", `${periodStart}T00:00:00`)
        .lte("completed_at", `${periodEnd}T23:59:59.999`)
        .order("completed_at", { ascending: true }),
    ]);

  if (entriesResult.error) {
    console.error("Erro ao carregar movimentações do PDF:", entriesResult.error);
  }

  if (reportResult.error) {
    console.error("Erro ao carregar snapshot do PDF:", reportResult.error);
  }

  if (maintenanceResult.error) {
    console.error(
      "Erro ao carregar manutenções pendentes do PDF:",
      maintenanceResult.error
    );
  }

  const ownerLink = (ownerLinkResult.data as OwnerLinkRow | null) ?? null;

  let owner: OwnerRow | null = null;

  if (ownerLink?.owner_id) {
    const { data: ownerData, error: ownerError } = await adminSupabase
      .from("property_owners")
      .select("id, full_name, email, phone, whatsapp")
      .eq("id", ownerLink.owner_id)
      .maybeSingle();

    if (ownerError) {
      console.error("Erro ao carregar proprietário do PDF:", ownerError);
    } else {
      owner = (ownerData as OwnerRow | null) ?? null;
    }
  }

  if (!owner) {
    redirect(
      `/admin/relatorios?imovel=${encodeURIComponent(propertyId)}&inicio=${periodStart}&fim=${periodEnd}&erro=relatorio-proprietario`
    );
  }

  const entries = (entriesResult.data ?? []) as FinancialEntry[];
  const savedReport = (reportResult.data as SavedReport | null) ?? null;
  const pendingMaintenance = (maintenanceResult.data ?? []) as PendingMaintenance[];
  let reportPayments: ReportPayment[] = [];

  if (savedReport) {
    const { data: paymentsData, error: paymentsError } = await adminSupabase
      .from("owner_report_payments")
      .select(`
        id,
        payment_date,
        amount,
        payment_method,
        payment_reference,
        notes,
        attachment_path
      `)
      .eq("report_id", savedReport.id)
      .order("payment_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (paymentsError) {
      console.error("Erro ao carregar pagamentos do PDF:", paymentsError);
    } else {
      reportPayments = (paymentsData ?? []) as ReportPayment[];
    }
  }

  const linkServicePlan: ServicePlan =
    ownerLink && isServicePlan(ownerLink.service_plan)
      ? ownerLink.service_plan
      : "custom";

  const currentCommissionPercentage = resolveCommissionPercentage(
    linkServicePlan,
    ownerLink?.commission_percentage ?? 0
  );

  const currentFinancial = calculateOwnerReportFinancial(
    entries,
    currentCommissionPercentage
  );

  const servicePlan: ServicePlan =
    savedReport && isServicePlan(savedReport.service_plan)
      ? savedReport.service_plan
      : linkServicePlan;

  const commissionPercentage = savedReport
    ? Number(savedReport.commission_percentage ?? 0)
    : currentFinancial.commissionPercentage;

  const grossRevenue = savedReport
    ? Number(savedReport.gross_revenue ?? 0)
    : currentFinancial.grossRevenue;

  const cleaningTotal = savedReport
    ? Number(savedReport.cleaning_total ?? 0)
    : currentFinancial.cleaningTotal;

  const commissionBase = savedReport
    ? Number(savedReport.commission_base ?? 0)
    : currentFinancial.commissionBase;

  const commissionAmount = savedReport
    ? Number(savedReport.commission_amount ?? 0)
    : currentFinancial.commissionAmount;

  const reimbursableExpenses = savedReport
    ? Number(savedReport.reimbursable_expenses ?? savedReport.deductible_expenses ?? 0)
    : currentFinancial.reimbursableExpenses;

  const amountDueToManager = savedReport
    ? Number(savedReport.amount_due_to_manager ?? 0)
    : currentFinancial.amountDueToManager;

  const netOwnerAmount = savedReport
    ? Number(savedReport.net_owner_amount ?? 0)
    : currentFinancial.netOwnerAmount;

  const totalExpenses = Math.max(
    0,
    Math.round((grossRevenue - commissionAmount - netOwnerAmount) * 100) / 100
  );

  const ownerPaidExpenses = Math.max(
    0,
    Math.round((totalExpenses - reimbursableExpenses) * 100) / 100
  );

  const amountPaid = reportPayments.reduce(
    (total, payment) => total + Number(payment.amount ?? 0),
    0
  );

  const remainingAmount = Math.max(
    0,
    Math.round((amountDueToManager - amountPaid) * 100) / 100
  );

  const maintenanceExpenses = entries
    .filter(
      (entry) =>
        entry.entry_type === "expense" &&
        entry.deduct_from_owner &&
        entry.category.toLocaleLowerCase("pt-BR").includes("manuten")
    )
    .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);

  const pendingMaintenanceTotal = pendingMaintenance.reduce(
    (sum, ticket) => sum + Number(ticket.final_cost ?? 0),
    0
  );

  const revenueByChannel = new Map<string, number>();
  const expenseByCategory = new Map<string, number>();

  for (const entry of entries) {
    if (entry.entry_type === "revenue") {
      const channel = entry.channel || "Canal não informado";
      revenueByChannel.set(
        channel,
        (revenueByChannel.get(channel) ?? 0) + Number(entry.amount ?? 0)
      );
    } else {
      expenseByCategory.set(
        entry.category,
        (expenseByCategory.get(entry.category) ?? 0) + Number(entry.amount ?? 0)
      );
    }
  }

  const backHref = `/admin/relatorios?imovel=${encodeURIComponent(propertyId)}&inicio=${periodStart}&fim=${periodEnd}`;
  const documentTitle = `prestacao-contas-${safeFileName(property.title)}-${periodStart}-${periodEnd}`;
  const generatedNow = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());

  return (
    <main className="report-page">
      <PrintActions backHref={backHref} documentTitle={documentTitle} />

      <article className="report-sheet">
        <header className="report-header">
          <div className="brand-block">
            <img
              src="/images/logo/logo1.jpg"
              alt="Aluga Casa Búzios"
              className="brand-logo"
            />
            <div>
              <p className="brand-name">ALUGA CASA BÚZIOS</p>
              <h1>Prestação de contas ao proprietário</h1>
              <p className="subtitle">Gestão de locações por temporada</p>
            </div>
          </div>

          <div className="status-block">
            <span className={`status status-${savedReport?.status ?? "preview"}`}>
              {getStatusLabel(savedReport?.status)}
            </span>
            <span className={`payment-status payment-${savedReport?.payment_status ?? "preview"}`}>
              {getPaymentStatusLabel(savedReport?.payment_status)}
            </span>
            <small>Gerado em {generatedNow}</small>
          </div>
        </header>

        <section className="identity-grid">
          <div>
            <span>Imóvel</span>
            <strong>{property.title}</strong>
          </div>
          <div>
            <span>Proprietário</span>
            <strong>{owner.full_name}</strong>
          </div>
          <div>
            <span>Período</span>
            <strong>
              {formatDate(periodStart)} a {formatDate(periodEnd)}
            </strong>
          </div>
          <div>
            <span>Contato</span>
            <strong>{owner.whatsapp || owner.phone || owner.email || "—"}</strong>
          </div>
        </section>

        <section className="summary-section">
          <h2>Resumo financeiro</h2>
          <div className="summary-grid">
            <div className="summary-card revenue">
              <span>Receita recebida pelo proprietário</span>
              <strong>{formatCurrency(grossRevenue)}</strong>
            </div>
            <div className="summary-card cleaning">
              <span>Faxina paga diretamente</span>
              <strong>{formatCurrency(cleaningTotal)}</strong>
            </div>
            <div className="summary-card commission">
              <span>Comissão ({commissionPercentage.toLocaleString("pt-BR")}%)</span>
              <strong>{formatCurrency(commissionAmount)}</strong>
            </div>
            <div className="summary-card expense">
              <span>Despesas a reembolsar</span>
              <strong>{formatCurrency(reimbursableExpenses)}</strong>
            </div>
            <div className="summary-card due">
              <span>Total a pagar à gestão</span>
              <strong>{formatCurrency(amountDueToManager)}</strong>
            </div>
            <div className="summary-card net">
              <span>Resultado líquido do proprietário</span>
              <strong>{formatCurrency(netOwnerAmount)}</strong>
            </div>
          </div>
          <p className="info-note">
            Plano: <strong>{getServicePlanLabel(servicePlan)}</strong>. A comissão foi calculada sobre {formatCurrency(commissionBase)}, após descontar {formatCurrency(cleaningTotal)} de faxinas da receita bruta. O proprietário paga as faxinas diretamente.
          </p>
          {ownerPaidExpenses > 0 && (
            <p className="info-note">
              Outras despesas pagas diretamente pelo proprietário: {formatCurrency(ownerPaidExpenses)}. Elas reduzem o resultado líquido, mas não entram no valor a reembolsar à gestão.
            </p>
          )}
          {maintenanceExpenses > 0 && (
            <p className="info-note">
              Manutenções pagas pela gestão e incluídas no reembolso: {formatCurrency(maintenanceExpenses)}.
            </p>
          )}
        </section>

        <section className="two-columns">
          <div className="section-card">
            <h2>Receitas por canal</h2>
            {revenueByChannel.size === 0 ? (
              <p className="empty">Nenhuma receita no período.</p>
            ) : (
              <div className="summary-list">
                {Array.from(revenueByChannel.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([channel, amount]) => (
                    <div key={channel}>
                      <span>{channel}</span>
                      <strong>{formatCurrency(amount)}</strong>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="section-card">
            <h2>Despesas por categoria</h2>
            {expenseByCategory.size === 0 ? (
              <p className="empty">Nenhuma despesa no período.</p>
            ) : (
              <div className="summary-list">
                {Array.from(expenseByCategory.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => (
                    <div key={category}>
                      <span>{category}</span>
                      <strong>{formatCurrency(amount)}</strong>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </section>

        {pendingMaintenance.length > 0 && (
          <section className="warning-section">
            <h2>Manutenções pendentes de lançamento</h2>
            <p>
              Estes valores ainda não estão incluídos no resultado nem no total a pagar à gestão.
            </p>
            <div className="summary-list">
              {pendingMaintenance.map((ticket) => (
                <div key={ticket.id}>
                  <span>
                    {ticket.ticket_number} — {ticket.problem}
                  </span>
                  <strong>{formatCurrency(ticket.final_cost)}</strong>
                </div>
              ))}
              <div className="list-total">
                <span>Total pendente</span>
                <strong>{formatCurrency(pendingMaintenanceTotal)}</strong>
              </div>
            </div>
          </section>
        )}

        <section className="movements-section">
          <div className="section-heading-row">
            <h2>Detalhamento das movimentações</h2>
            <span>{entries.length} lançamento(s)</span>
          </div>

          {entries.length === 0 ? (
            <p className="empty">Nenhuma movimentação cadastrada no período.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Categoria</th>
                  <th>Canal / referência</th>
                  <th>Descrição</th>
                  <th className="money">Valor</th>
                  <th>Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.entry_date)}</td>
                    <td>{entry.entry_type === "revenue" ? "Receita" : "Despesa"}</td>
                    <td>{entry.category}</td>
                    <td>{entry.channel || entry.reservation_reference || "—"}</td>
                    <td>{entry.description}</td>
                    <td className="money">
                      {entry.entry_type === "revenue" ? "+ " : "- "}
                      {formatCurrency(entry.amount)}
                    </td>
                    <td>
                      {entry.entry_type === "revenue"
                        ? "Recebido pelo proprietário"
                        : isCleaningCategory(entry.category)
                          ? "Pago pelo proprietário"
                          : entry.deduct_from_owner
                            ? "Reembolsar gestão"
                            : "Pago pelo proprietário"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="payments-section">
          <div className="section-heading-row">
            <h2>Pagamentos à gestão</h2>
            <span>{getPaymentStatusLabel(savedReport?.payment_status)}</span>
          </div>

          <div className="payment-summary">
            <div>
              <span>Total devido</span>
              <strong>{formatCurrency(amountDueToManager)}</strong>
            </div>
            <div>
              <span>Total pago</span>
              <strong>{formatCurrency(amountPaid)}</strong>
            </div>
            <div>
              <span>Saldo pendente</span>
              <strong>{formatCurrency(remainingAmount)}</strong>
            </div>
          </div>

          {reportPayments.length === 0 ? (
            <p className="empty payment-empty">
              Nenhum pagamento registrado para este relatório.
            </p>
          ) : (
            <div className="payment-list">
              {reportPayments.map((payment) => (
                <div key={payment.id}>
                  <span>
                    {formatDate(payment.payment_date)} • {getPaymentMethodLabel(payment.payment_method)}
                    {payment.payment_reference
                      ? ` • ${payment.payment_reference}`
                      : ""}
                  </span>
                  <strong>{formatCurrency(payment.amount)}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="notes-section">
          <h2>Observações ao proprietário</h2>
          <p>{savedReport?.notes || "Sem observações registradas para este período."}</p>
        </section>

        <footer className="report-footer">
          <div>
            <strong>Aluga Casa Búzios</strong>
            <span>Gestão de locações por temporada</span>
          </div>
          <div className="footer-meta">
            {savedReport?.generated_at && (
              <span>Fechado em {formatDateTime(savedReport.generated_at)}</span>
            )}
            {savedReport?.sent_at && (
              <span>Enviado em {formatDateTime(savedReport.sent_at)}</span>
            )}
          </div>
        </footer>
      </article>

      <style>{`
        :root {
          color-scheme: light;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          background: #e2e8f0;
          color: #0f172a;
          font-family: Arial, Helvetica, sans-serif;
        }
        .report-page {
          min-height: 100vh;
          padding: 28px 16px 48px;
        }
        .print-actions {
          width: min(210mm, calc(100vw - 32px));
          margin: 0 auto 16px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }
        .print-actions button,
        .print-actions a {
          min-height: 44px;
          border-radius: 10px;
          padding: 10px 16px;
          border: 0;
          text-decoration: none;
          font-weight: 800;
          cursor: pointer;
        }
        .print-actions button {
          background: #172554;
          color: white;
        }
        .print-actions a {
          background: white;
          color: #172554;
          border: 1px solid #bfdbfe;
        }
        .print-actions span {
          color: #475569;
          font-size: 13px;
        }
        .report-sheet {
          width: min(210mm, calc(100vw - 32px));
          min-height: 297mm;
          margin: 0 auto;
          background: white;
          padding: 14mm;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14);
        }
        .report-header {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          padding-bottom: 18px;
          border-bottom: 3px solid #172554;
        }
        .brand-block {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .brand-logo {
          width: 66px;
          height: 66px;
          object-fit: cover;
          border-radius: 14px;
        }
        .brand-name {
          margin: 0 0 4px;
          font-size: 11px;
          letter-spacing: 0.16em;
          font-weight: 900;
          color: #1e3a8a;
        }
        h1 {
          margin: 0;
          font-size: 24px;
          line-height: 1.12;
          color: #0f172a;
        }
        .subtitle {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
        }
        .status-block {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          text-align: right;
        }
        .status {
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .payment-status {
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .payment-paid {
          background: #dcfce7;
          color: #166534;
        }
        .payment-partial {
          background: #e0f2fe;
          color: #075985;
        }
        .payment-pending {
          background: #fee2e2;
          color: #991b1b;
        }
        .payment-not_due,
        .payment-preview {
          background: #fef3c7;
          color: #92400e;
        }
        .payment-cancelled {
          background: #e2e8f0;
          color: #475569;
        }
        .status-draft,
        .status-preview {
          background: #fef3c7;
          color: #92400e;
        }
        .status-closed {
          background: #dbeafe;
          color: #1e40af;
        }
        .status-sent {
          background: #dcfce7;
          color: #166534;
        }
        .status-block small {
          color: #64748b;
          font-size: 10px;
        }
        .identity-grid {
          margin-top: 18px;
          display: grid;
          grid-template-columns: 1.25fr 1fr 1fr 1fr;
          gap: 10px;
        }
        .identity-grid > div {
          border-radius: 10px;
          background: #f8fafc;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
        }
        .identity-grid span,
        .summary-card span {
          display: block;
          color: #64748b;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .identity-grid strong {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          line-height: 1.25;
        }
        section {
          margin-top: 20px;
        }
        section h2 {
          margin: 0 0 10px;
          font-size: 15px;
          color: #172554;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .summary-card {
          border-radius: 12px;
          padding: 13px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .summary-card strong {
          display: block;
          margin-top: 7px;
          font-size: 17px;
        }
        .summary-card.revenue strong {
          color: #047857;
        }
        .summary-card.expense strong {
          color: #b91c1c;
        }
        .summary-card.cleaning strong {
          color: #b45309;
        }
        .summary-card.commission strong {
          color: #1d4ed8;
        }
        .summary-card.maintenance strong {
          color: #b45309;
        }
        .summary-card.due {
          background: #ecfdf5;
          border-color: #6ee7b7;
        }
        .summary-card.due strong {
          color: #047857;
        }
        .summary-card.net {
          background: #172554;
          border-color: #172554;
        }
        .summary-card.net span {
          color: #bfdbfe;
        }
        .summary-card.net strong {
          color: white;
        }
        .info-note {
          margin: 9px 0 0;
          padding: 8px 10px;
          border-radius: 8px;
          background: #f8fafc;
          color: #475569;
          font-size: 10px;
        }
        .two-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .section-card,
        .notes-section,
        .warning-section {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 13px;
        }
        .summary-list > div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 7px 0;
          border-top: 1px solid #f1f5f9;
          font-size: 11px;
        }
        .summary-list > div:first-child {
          border-top: 0;
        }
        .summary-list strong {
          white-space: nowrap;
        }
        .warning-section {
          background: #fffbeb;
          border-color: #fde68a;
        }
        .warning-section h2 {
          color: #92400e;
        }
        .warning-section > p {
          margin: -4px 0 10px;
          color: #92400e;
          font-size: 10px;
        }
        .list-total {
          font-weight: 900;
          color: #92400e;
        }
        .section-heading-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
        }
        .section-heading-row span {
          color: #64748b;
          font-size: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5px;
        }
        thead {
          display: table-header-group;
        }
        th {
          padding: 7px 5px;
          border-bottom: 1.5px solid #cbd5e1;
          color: #475569;
          text-align: left;
          font-size: 7.5px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        td {
          padding: 7px 5px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: top;
          line-height: 1.3;
        }
        tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .money {
          text-align: right;
          white-space: nowrap;
          font-weight: 800;
        }
        .notes-section p,
        .empty {
          margin: 0;
          color: #475569;
          font-size: 11px;
          line-height: 1.55;
          white-space: pre-wrap;
        }
        .payments-section {
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          padding: 13px;
          background: #f8fafc;
        }
        .payment-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 9px;
        }
        .payment-summary > div {
          border-radius: 9px;
          border: 1px solid #dbeafe;
          background: white;
          padding: 9px 10px;
        }
        .payment-summary span {
          display: block;
          color: #64748b;
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
        }
        .payment-summary strong {
          display: block;
          margin-top: 4px;
          color: #172554;
          font-size: 13px;
        }
        .payment-list {
          margin-top: 8px;
        }
        .payment-list > div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          border-top: 1px solid #e2e8f0;
          padding: 7px 2px;
          font-size: 10px;
        }
        .payment-list strong {
          white-space: nowrap;
          color: #047857;
        }
        .payment-empty {
          margin-top: 9px;
        }
        .report-footer {
          margin-top: 24px;
          padding-top: 14px;
          border-top: 2px solid #172554;
          display: flex;
          justify-content: space-between;
          gap: 20px;
          color: #475569;
          font-size: 9px;
        }
        .report-footer strong,
        .report-footer span {
          display: block;
        }
        .report-footer strong {
          color: #172554;
          font-size: 11px;
        }
        .footer-meta {
          text-align: right;
        }
        @media (max-width: 800px) {
          .report-sheet {
            padding: 24px;
          }
          .report-header,
          .brand-block {
            align-items: flex-start;
          }
          .report-header {
            flex-direction: column;
          }
          .status-block {
            align-items: flex-start;
            text-align: left;
          }
          .identity-grid,
          .summary-grid,
          .two-columns,
          .payment-summary {
            grid-template-columns: 1fr 1fr;
          }
        }
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        @media print {
          html,
          body {
            background: white !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .report-page {
            padding: 0;
          }
          .print-actions {
            display: none !important;
          }
          .report-sheet {
            width: 100%;
            min-height: auto;
            margin: 0;
            padding: 0;
            box-shadow: none;
          }
          .section-card,
          .summary-card,
          .notes-section,
          .warning-section,
          .identity-grid > div {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          a {
            color: inherit;
            text-decoration: none;
          }
        }
      `}</style>
    </main>
  );
}
