import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import VirtualTourReportActions from "@/components/virtual-tour/VirtualTourReportActions";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const STORAGE_BUCKET = "virtual-tour-images";

type ReportPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    inicio?: string;
    fim?: string;
  }>;
};

type TourRecord = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  brand_name: string | null;
  contact_name: string | null;
  cover_image_path: string | null;
  logo_path: string | null;
  primary_color: string | null;
  accent_color: string | null;
  created_at: string;
};

type TourSceneRecord = {
  id: string;
  name: string;
  panorama_path: string;
  thumbnail_path: string | null;
  sort_order: number;
};

type TourServiceRecord = {
  client_id: string;
  amount_cents: number | string;
  due_date: string | null;
  payment_status: string;
  service_status: string;
};

type TourClientRecord = {
  name: string;
  company_name: string | null;
};

type SceneAnalytics = {
  scene_id: string;
  scene_name: string;
  views: number;
};

type DailyAnalytics = {
  date: string;
  views: number;
};

type AnalyticsSummary = {
  total_views: number;
  previous_period_views: number;
  whatsapp_clicks: number;
  embedded_views: number;
  scene_ranking: SceneAnalytics[];
  daily_views: DailyAnalytics[];
};

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getSafeColor(value: string | null, fallback: string): string {
  return value && /^#[0-9A-F]{6}$/i.test(value)
    ? value.toUpperCase()
    : fallback;
}

function getNumericValue(value: unknown): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0;
}

function parseAnalyticsSummary(value: unknown): AnalyticsSummary | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const sceneRanking = Array.isArray(record.scene_ranking)
    ? record.scene_ranking
        .filter((scene) => Boolean(scene && typeof scene === "object" && !Array.isArray(scene)))
        .map((scene) => {
          const sceneRecord = scene as Record<string, unknown>;
          return {
            scene_id: String(sceneRecord.scene_id ?? ""),
            scene_name: String(sceneRecord.scene_name ?? "Ambiente"),
            views: getNumericValue(sceneRecord.views),
          };
        })
        .filter((scene) => Boolean(scene.scene_id))
    : [];

  const dailyViews = Array.isArray(record.daily_views)
    ? record.daily_views
        .filter((day) => Boolean(day && typeof day === "object" && !Array.isArray(day)))
        .map((day) => {
          const dayRecord = day as Record<string, unknown>;
          return {
            date: String(dayRecord.date ?? ""),
            views: getNumericValue(dayRecord.views),
          };
        })
        .filter((day) => Boolean(day.date))
    : [];

  return {
    total_views: getNumericValue(record.total_views),
    previous_period_views: getNumericValue(record.previous_period_views),
    whatsapp_clicks: getNumericValue(record.whatsapp_clicks),
    embedded_views: getNumericValue(record.embedded_views),
    scene_ranking: sceneRanking,
    daily_views: dailyViews,
  };
}

function getCurrentDateParts(): {
  year: string;
  month: string;
  day: string;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).formatToParts(new Date());

  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
  };
}

function getDefaultPeriod(): {
  startDate: string;
  endDate: string;
} {
  const currentDate = getCurrentDateParts();

  return {
    startDate: `${currentDate.year}-${currentDate.month}-01`,
    endDate: `${currentDate.year}-${currentDate.month}-${currentDate.day}`,
  };
}

function parseIsoDate(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return date;
}

function resolvePeriod(
  startValue: string | undefined,
  endValue: string | undefined
): {
  startDate: string;
  endDate: string;
  wasAdjusted: boolean;
} {
  const fallback = getDefaultPeriod();
  const start = parseIsoDate(startValue);
  const end = parseIsoDate(endValue);

  if (!start || !end || start.getTime() > end.getTime()) {
    return { ...fallback, wasAdjusted: Boolean(startValue || endValue) };
  }

  const periodDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;

  if (periodDays > 92) {
    return { ...fallback, wasAdjusted: true };
  }

  return {
    startDate: startValue as string,
    endDate: endValue as string,
    wasAdjusted: false,
  };
}

function formatPeriodDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatCurrencyFromCents(value: number | string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(getNumericValue(value) / 100);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Não definido";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Não definido";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function formatShortDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function getPaymentLabel(value: string): string {
  const labels: Record<string, string> = {
    pending: "Pendente",
    paid: "Pago",
    overdue: "Em atraso",
    waived: "Isento",
  };

  return labels[value] ?? value;
}

function getServiceLabel(value: string): string {
  const labels: Record<string, string> = {
    active: "Ativo",
    suspended: "Suspenso",
    canceled: "Cancelado",
  };

  return labels[value] ?? value;
}

export default async function VirtualTourReportPage({
  params,
  searchParams,
}: ReportPageProps) {
  const { id } = await params;
  const { inicio, fim } = await searchParams;
  const period = resolvePeriod(inicio, fim);

  if (!isValidUuid(id)) {
    notFound();
  }

  const authenticationClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authenticationClient.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: isAdmin } = await authenticationClient.rpc("is_management_admin");

  if (isAdmin !== true) {
    redirect("/admin");
  }

  const supabase = createSupabaseAdminClient();
  const [tourResult, scenesResult, serviceResult, analyticsResult] = await Promise.all([
    supabase
      .from("virtual_tours")
      .select(`
        id,
        title,
        slug,
        description,
        brand_name,
        contact_name,
        cover_image_path,
        logo_path,
        primary_color,
        accent_color,
        created_at
      `)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("virtual_tour_scenes")
      .select("id, name, panorama_path, thumbnail_path, sort_order")
      .eq("tour_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("virtual_tour_services")
      .select("client_id, amount_cents, due_date, payment_status, service_status")
      .eq("tour_id", id)
      .maybeSingle(),
    supabase.rpc("get_virtual_tour_analytics_period", {
      p_tour_id: id,
      p_start_date: period.startDate,
      p_end_date: period.endDate,
    }),
  ]);

  if (tourResult.error) {
    console.error("Erro ao carregar passeio para o relatório:", tourResult.error);
  }

  if (!tourResult.data) {
    notFound();
  }

  const tour = tourResult.data as TourRecord;
  const scenes = (scenesResult.data ?? []) as TourSceneRecord[];
  const service = serviceResult.data as TourServiceRecord | null;
  const summary = parseAnalyticsSummary(analyticsResult.data);

  let client: TourClientRecord | null = null;

  if (service?.client_id) {
    const clientResult = await supabase
      .from("virtual_tour_clients")
      .select("name, company_name")
      .eq("id", service.client_id)
      .maybeSingle();

    client = clientResult.data as TourClientRecord | null;
  }

  const primaryColor = getSafeColor(tour.primary_color, "#172554");
  const accentColor = getSafeColor(tour.accent_color, "#38BDF8");
  const publicTourUrl = `/tour/${tour.slug}`;
  const logoPublicUrl = tour.logo_path
    ? supabase.storage.from(STORAGE_BUCKET).getPublicUrl(tour.logo_path).data.publicUrl
    : null;
  const coverScene = scenes.find((scene) => scene.panorama_path === tour.cover_image_path) ?? scenes[0];
  const coverDisplayPath = coverScene?.thumbnail_path && coverScene.thumbnail_path !== coverScene.panorama_path
    ? coverScene.thumbnail_path
    : tour.cover_image_path ?? coverScene?.panorama_path ?? null;
  const coverPublicUrl = coverDisplayPath
    ? supabase.storage.from(STORAGE_BUCKET).getPublicUrl(coverDisplayPath).data.publicUrl
    : null;
  const analytics = summary ?? {
    total_views: 0,
    previous_period_views: 0,
    whatsapp_clicks: 0,
    embedded_views: 0,
    scene_ranking: [],
    daily_views: [],
  };
  const contactRate = analytics.total_views > 0
    ? (analytics.whatsapp_clicks / analytics.total_views) * 100
    : 0;
  const maximumDailyViews = Math.max(1, ...analytics.daily_views.map((day) => day.views));
  const maximumSceneViews = Math.max(1, ...analytics.scene_ranking.map((scene) => scene.views));
  const mostVisitedScene = analytics.scene_ranking.find((scene) => scene.views > 0);
  const viewDifference = analytics.total_views - analytics.previous_period_views;
  const viewVariation = analytics.previous_period_views > 0
    ? (viewDifference / analytics.previous_period_views) * 100
    : null;
  const generatedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:px-6 print:bg-white print:p-0">
      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          .no-print { display: none !important; }
          .report-sheet { box-shadow: none !important; border-radius: 0 !important; max-width: none !important; }
          .report-section { break-inside: avoid; }
          * { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/tours/${tour.id}`}
          style={{ color: "#172554" }}
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black shadow-sm"
        >
          Voltar ao passeio
        </Link>
        <VirtualTourReportActions primaryColor={primaryColor} />
      </div>

      <form
        method="get"
        className="no-print mx-auto mb-4 grid max-w-5xl gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <label className="text-sm font-black text-blue-950">
          Data inicial
          <input
            type="date"
            name="inicio"
            defaultValue={period.startDate}
            required
            className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-800"
          />
        </label>
        <label className="text-sm font-black text-blue-950">
          Data final
          <input
            type="date"
            name="fim"
            defaultValue={period.endDate}
            required
            className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-800"
          />
        </label>
        <button
          type="submit"
          style={{ backgroundColor: primaryColor, color: "#FFFFFF" }}
          className="rounded-xl px-5 py-3 font-black shadow-sm transition hover:brightness-110"
        >
          Atualizar relatório
        </button>
        <p className="text-xs font-semibold text-slate-500 sm:col-span-3">
          Escolha um período de até 92 dias. O relatório compara automaticamente com o período anterior de mesma duração.
        </p>
      </form>

      {period.wasAdjusted && (
        <div className="no-print mx-auto mb-4 max-w-5xl rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          O período informado era inválido ou maior que 92 dias. O relatório voltou para o mês atual.
        </div>
      )}

      {analyticsResult.error && (
        <div className="no-print mx-auto mb-4 max-w-5xl rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          As estatísticas por período ainda não estão disponíveis. Execute a atualização SQL desta etapa no Supabase.
        </div>
      )}

      <article className="report-sheet mx-auto max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl">
        <header
          style={{ backgroundColor: primaryColor, borderBottomColor: accentColor }}
          className="report-section border-b-8 px-7 py-7 text-white sm:px-10"
        >
          <div className="flex items-center justify-between gap-6">
            <div className="min-w-0">
              <p style={{ color: accentColor }} className="text-xs font-black uppercase tracking-[0.24em]">
                Relatório de desempenho
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight">{tour.title}</h1>
              <p className="mt-2 text-sm font-semibold text-white/80">
                Período de {formatPeriodDate(period.startDate)} a {formatPeriodDate(period.endDate)}
              </p>
              <p className="mt-1 text-xs font-semibold text-white/60">
                Passeio virtual 360° · relatório gerado em {generatedAt}
              </p>
            </div>
            {logoPublicUrl ? (
              <div className="flex h-20 w-36 shrink-0 items-center justify-center rounded-2xl bg-white p-3">
                <img src={logoPublicUrl} alt={tour.brand_name ?? tour.title} className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div style={{ backgroundColor: accentColor }} className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-xl font-black text-blue-950">
                360°
              </div>
            )}
          </div>
        </header>

        {coverPublicUrl && (
          <div
            className="h-48 bg-slate-200 bg-cover bg-center sm:h-56"
            style={{ backgroundImage: `linear-gradient(90deg, ${primaryColor}55, transparent), url("${coverPublicUrl}")` }}
            role="img"
            aria-label={`Capa do passeio ${tour.title}`}
          />
        )}

        <div className="space-y-7 px-7 py-7 sm:px-10">
          <section className="report-section grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Cliente</p>
              <p className="mt-1 text-lg font-black text-blue-950">{client?.name ?? tour.contact_name ?? "Cliente não vinculado"}</p>
              <p className="mt-1 text-sm text-slate-600">{client?.company_name ?? tour.brand_name ?? "Sem empresa informada"}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Passeio</p>
              <p className="mt-1 font-black text-blue-950">{tour.title}</p>
              <p className="mt-1 text-sm text-slate-600">Criado em {formatDate(tour.created_at)}</p>
            </div>
          </section>

          <section className="report-section">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">Resultados</p>
                <h2 className="mt-1 text-xl font-black text-blue-950">Resumo do desempenho</h2>
              </div>
              <p className="text-xs font-semibold text-slate-500">Dados atualizados automaticamente</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-600">Visualizações no período</p>
                <p className="mt-2 text-3xl font-black text-blue-950">{formatNumber(analytics.total_views)}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">{formatNumber(analytics.embedded_views)} incorporadas</p>
              </div>
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <p className="text-xs font-bold text-sky-900">Período anterior</p>
                <p className="mt-2 text-3xl font-black text-sky-800">{formatNumber(analytics.previous_period_views)}</p>
                <p className="mt-1 text-[11px] font-semibold text-sky-700">
                  {viewVariation === null
                    ? (analytics.total_views > 0 ? "Novo movimento registrado" : "Sem variação registrada")
                    : `${viewDifference >= 0 ? "+" : ""}${viewVariation.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% no período atual`}
                </p>
              </div>
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                <p className="text-xs font-bold text-green-900">Cliques no WhatsApp</p>
                <p className="mt-2 text-3xl font-black text-green-800">{formatNumber(analytics.whatsapp_clicks)}</p>
                <p className="mt-1 text-[11px] font-semibold text-green-700">Contatos iniciados</p>
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                <p className="text-xs font-bold text-violet-900">Conversão</p>
                <p className="mt-2 text-3xl font-black text-violet-800">
                  {contactRate.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                </p>
                <p className="mt-1 text-[11px] font-semibold text-violet-700">Cliques por visualização</p>
              </div>
            </div>
          </section>

          <section className="report-section rounded-2xl border border-slate-200 p-5">
            <h2 className="font-black text-blue-950">Visualizações no período selecionado</h2>
            <div className="mt-5 flex h-40 items-end gap-1 overflow-x-auto">
              {analytics.daily_views.length === 0 ? (
                <p className="m-auto text-sm font-semibold text-slate-500">Ainda não há visualizações registradas neste período.</p>
              ) : analytics.daily_views.map((day) => {
                const barHeight = day.views === 0
                  ? 4
                  : Math.max(12, Math.round((day.views / maximumDailyViews) * 108));

                return (
                  <div key={day.date} className="flex min-w-3 flex-1 flex-col items-center justify-end">
                    <span className="mb-1 text-[10px] font-black text-blue-950">{day.views}</span>
                    <div
                      style={{ height: `${barHeight}px`, backgroundColor: accentColor }}
                      className="w-full max-w-8 rounded-t-md"
                    />
                    <span className="mt-1 text-[8px] font-bold text-slate-500">{formatShortDate(day.date)}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="report-section grid gap-5 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
            <div className="rounded-2xl border border-slate-200 p-5">
              <h2 className="font-black text-blue-950">Ambientes mais acessados</h2>
              <div className="mt-4 space-y-3">
                {analytics.scene_ranking.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Nenhum ambiente cadastrado.</p>
                ) : analytics.scene_ranking.slice(0, 8).map((scene, index) => (
                  <div key={scene.scene_id}>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <p className="min-w-0 truncate font-black text-slate-800">{index + 1}. {scene.scene_name}</p>
                      <span className="shrink-0 font-black text-blue-950">{formatNumber(scene.views)}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        style={{
                          width: `${Math.max(scene.views === 0 ? 0 : 5, (scene.views / maximumSceneViews) * 100)}%`,
                          backgroundColor: primaryColor,
                        }}
                        className="h-full rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="font-black text-blue-950">Leitura dos resultados</h2>
              <div className="mt-4 space-y-3 text-sm leading-5 text-slate-700">
                <p>
                  <strong className="text-blue-950">Maior interesse:</strong>{" "}
                  {mostVisitedScene ? `${mostVisitedScene.scene_name}, com ${formatNumber(mostVisitedScene.views)} acesso(s).` : "ainda sem dados suficientes."}
                </p>
                <p>
                  <strong className="text-blue-950">Geração de contatos:</strong>{" "}
                  {analytics.whatsapp_clicks > 0
                    ? `${formatNumber(analytics.whatsapp_clicks)} visitante(s) iniciou(aram) contato pelo WhatsApp.`
                    : "ainda não houve clique no WhatsApp."}
                </p>
                <p>
                  <strong className="text-blue-950">Alcance recente:</strong>{" "}
                  {formatNumber(analytics.total_views)} visualização(ões) entre {formatPeriodDate(period.startDate)} e {formatPeriodDate(period.endDate)}.
                </p>
              </div>
            </div>
          </section>

          {service && (
            <section className="report-section rounded-2xl border border-slate-200 p-5">
              <h2 className="font-black text-blue-950">Informações do serviço</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs font-bold text-slate-500">Valor contratado</p>
                  <p className="mt-1 font-black text-slate-800">{formatCurrencyFromCents(service.amount_cents)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">Vencimento</p>
                  <p className="mt-1 font-black text-slate-800">{formatDate(service.due_date)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">Pagamento</p>
                  <p className="mt-1 font-black text-slate-800">{getPaymentLabel(service.payment_status)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">Serviço</p>
                  <p className="mt-1 font-black text-slate-800">{getServiceLabel(service.service_status)}</p>
                </div>
              </div>
            </section>
          )}

          <footer className="report-section border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
            <div className="flex flex-col justify-between gap-2 sm:flex-row">
              <p>Relatório gerado pelo painel Aluga Casa Búzios · Passeios 360°.</p>
              <Link href={publicTourUrl} className="no-print font-black text-sky-700">
                Abrir passeio público
              </Link>
            </div>
            <p className="mt-2">
              Privacidade: as estatísticas são anônimas e não armazenam IP, localização, nome ou dados pessoais dos visitantes.
            </p>
          </footer>
        </div>
      </article>
    </main>
  );
}
