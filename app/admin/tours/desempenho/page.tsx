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

export const dynamic = "force-dynamic";

type TourPerformance = {
  tour_id: string;
  title: string;
  slug: string;
  status: string;
  brand_name: string | null;
  client_name: string;
  total_views: number;
  views_last_30_days: number;
  views_last_7_days: number;
  whatsapp_clicks: number;
  embedded_views: number;
};

type DailyPerformance = {
  date: string;
  views: number;
};

type ToursOverview = {
  total_tours: number;
  published_tours: number;
  total_views: number;
  views_last_30_days: number;
  views_last_7_days: number;
  whatsapp_clicks: number;
  embedded_views: number;
  tour_ranking: TourPerformance[];
  daily_views: DailyPerformance[];
};

function getNumericValue(value: unknown): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0;
}

function parseOverview(value: unknown): ToursOverview | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const tourRanking = Array.isArray(record.tour_ranking)
    ? record.tour_ranking
        .filter((tour) => Boolean(tour && typeof tour === "object" && !Array.isArray(tour)))
        .map((tour) => {
          const tourRecord = tour as Record<string, unknown>;
          return {
            tour_id: String(tourRecord.tour_id ?? ""),
            title: String(tourRecord.title ?? "Passeio 360°"),
            slug: String(tourRecord.slug ?? ""),
            status: String(tourRecord.status ?? "draft"),
            brand_name: tourRecord.brand_name ? String(tourRecord.brand_name) : null,
            client_name: String(tourRecord.client_name ?? "Cliente não vinculado"),
            total_views: getNumericValue(tourRecord.total_views),
            views_last_30_days: getNumericValue(tourRecord.views_last_30_days),
            views_last_7_days: getNumericValue(tourRecord.views_last_7_days),
            whatsapp_clicks: getNumericValue(tourRecord.whatsapp_clicks),
            embedded_views: getNumericValue(tourRecord.embedded_views),
          };
        })
        .filter((tour) => Boolean(tour.tour_id))
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
    total_tours: getNumericValue(record.total_tours),
    published_tours: getNumericValue(record.published_tours),
    total_views: getNumericValue(record.total_views),
    views_last_30_days: getNumericValue(record.views_last_30_days),
    views_last_7_days: getNumericValue(record.views_last_7_days),
    whatsapp_clicks: getNumericValue(record.whatsapp_clicks),
    embedded_views: getNumericValue(record.embedded_views),
    tour_ranking: tourRanking,
    daily_views: dailyViews,
  };
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
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

function formatPercentage(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export default async function VirtualToursPerformancePage() {
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
  const overviewResult = await supabase.rpc("get_virtual_tours_overview");

  if (overviewResult.error) {
    console.error("Erro ao carregar desempenho geral dos passeios:", overviewResult.error);
  }

  const overview = parseOverview(overviewResult.data);
  const totalConversion = overview && overview.total_views > 0
    ? (overview.whatsapp_clicks / overview.total_views) * 100
    : 0;
  const maximumDailyViews = Math.max(1, ...(overview?.daily_views ?? []).map((day) => day.views));
  const maximumTourViews = Math.max(1, ...(overview?.tour_ranking ?? []).map((tour) => tour.total_views));

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl bg-blue-950 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-sky-300">Desempenho comercial</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">Visão geral dos passeios 360°</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
                Compare o alcance dos passeios, os contatos iniciados e os resultados de cada cliente em um único painel.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/tours"
                style={{ color: "#172554" }}
                className="rounded-xl bg-white px-5 py-3 text-sm font-black transition hover:bg-slate-100"
              >
                Voltar aos passeios
              </Link>
              <Link
                href="/admin/tours/novo"
                style={{ color: "#082F49" }}
                className="rounded-xl bg-sky-300 px-5 py-3 text-sm font-black transition hover:bg-sky-200"
              >
                Novo passeio
              </Link>
            </div>
          </div>
        </header>

        {overviewResult.error || !overview ? (
          <section className="mt-6 rounded-3xl border border-amber-300 bg-amber-50 p-6 shadow-sm">
            <h2 className="text-xl font-black text-blue-950">Atualização necessária</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-amber-900">
              Execute no Supabase a atualização SQL desta etapa para ativar o painel de desempenho geral.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-bold text-slate-600">Passeios cadastrados</p>
                <p className="mt-2 text-3xl font-black text-blue-950">{formatNumber(overview.total_tours)}</p>
                <p className="mt-2 text-xs font-semibold text-slate-500">{formatNumber(overview.published_tours)} publicado(s)</p>
              </article>
              <article className="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
                <p className="text-sm font-bold text-sky-900">Visualizações totais</p>
                <p className="mt-2 text-3xl font-black text-sky-800">{formatNumber(overview.total_views)}</p>
                <p className="mt-2 text-xs font-semibold text-sky-700">{formatNumber(overview.embedded_views)} incorporadas</p>
              </article>
              <article className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
                <p className="text-sm font-bold text-cyan-900">Últimos 30 dias</p>
                <p className="mt-2 text-3xl font-black text-cyan-800">{formatNumber(overview.views_last_30_days)}</p>
                <p className="mt-2 text-xs font-semibold text-cyan-700">{formatNumber(overview.views_last_7_days)} nos últimos 7 dias</p>
              </article>
              <article className="rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm">
                <p className="text-sm font-bold text-green-900">Cliques no WhatsApp</p>
                <p className="mt-2 text-3xl font-black text-green-800">{formatNumber(overview.whatsapp_clicks)}</p>
                <p className="mt-2 text-xs font-semibold text-green-700">Contatos iniciados</p>
              </article>
              <article className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
                <p className="text-sm font-bold text-violet-900">Conversão geral</p>
                <p className="mt-2 text-3xl font-black text-violet-800">{formatPercentage(totalConversion)}%</p>
                <p className="mt-2 text-xs font-semibold text-violet-700">Cliques por visualização</p>
              </article>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <article className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-blue-950">Movimento nos últimos 14 dias</h2>
                <p className="mt-1 text-sm text-slate-600">Visualizações somadas de todos os passeios publicados.</p>
                <div className="mt-6 flex h-52 items-end gap-2 overflow-x-auto pb-1">
                  {overview.daily_views.map((day) => {
                    const barHeight = day.views === 0
                      ? 4
                      : Math.max(14, Math.round((day.views / maximumDailyViews) * 150));

                    return (
                      <div key={day.date} className="flex min-w-9 flex-1 flex-col items-center justify-end">
                        <span className="mb-1 text-xs font-black text-blue-950">{day.views}</span>
                        <div
                          title={`${formatShortDate(day.date)}: ${day.views} visualização(ões)`}
                          style={{ height: `${barHeight}px` }}
                          className="w-full max-w-9 rounded-t-lg bg-sky-500"
                        />
                        <span className="mt-2 -rotate-45 text-[10px] font-bold text-slate-500">{formatShortDate(day.date)}</span>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-blue-950">Destaques comerciais</h2>
                <div className="mt-5 space-y-4">
                  {overview.tour_ranking.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 p-5 text-center text-sm font-semibold text-slate-600">Nenhum passeio cadastrado.</p>
                  ) : overview.tour_ranking.slice(0, 5).map((tour, index) => (
                    <div key={tour.tour_id}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <p className="min-w-0 truncate font-black text-slate-800">{index + 1}. {tour.title}</p>
                        <span className="shrink-0 font-black text-blue-950">{formatNumber(tour.total_views)}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          style={{ width: `${Math.max(tour.total_views === 0 ? 0 : 5, (tour.total_views / maximumTourViews) * 100)}%` }}
                          className="h-full rounded-full bg-blue-950"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-xl font-black text-blue-950">Desempenho por passeio</h2>
                <p className="mt-1 text-sm text-slate-600">Ranking completo, do passeio mais visualizado para o menos acessado.</p>
              </div>

              {overview.tour_ranking.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="font-black text-blue-950">Nenhum passeio encontrado</p>
                  <Link href="/admin/tours/novo" className="mt-4 inline-flex rounded-xl bg-blue-950 px-5 py-3 text-sm font-black text-white">
                    Cadastrar passeio
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {overview.tour_ranking.map((tour, index) => {
                    const conversion = tour.total_views > 0
                      ? (tour.whatsapp_clicks / tour.total_views) * 100
                      : 0;

                    return (
                      <article key={tour.tour_id} className="grid gap-5 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_repeat(4,110px)_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-950 text-xs font-black text-white">{index + 1}</span>
                            <h3 className="truncate font-black text-blue-950">{tour.title}</h3>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${tour.status === "published" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}>
                              {tour.status === "published" ? "Publicado" : "Rascunho"}
                            </span>
                          </div>
                          <p className="mt-2 truncate text-xs font-semibold text-slate-500">{tour.client_name}</p>
                        </div>

                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Visualizações</p>
                          <p className="mt-1 text-lg font-black text-blue-950">{formatNumber(tour.total_views)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">30 dias</p>
                          <p className="mt-1 text-lg font-black text-sky-700">{formatNumber(tour.views_last_30_days)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">WhatsApp</p>
                          <p className="mt-1 text-lg font-black text-green-700">{formatNumber(tour.whatsapp_clicks)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Conversão</p>
                          <p className="mt-1 text-lg font-black text-violet-700">{formatPercentage(conversion)}%</p>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <Link
                            href={`/admin/tours/${tour.tour_id}`}
                            className="rounded-lg border border-blue-950 px-3 py-2 text-xs font-black text-blue-950"
                          >
                            Editar
                          </Link>
                          <Link
                            href={`/admin/tours/${tour.tour_id}/relatorio`}
                            target="_blank"
                            style={{ color: "#FFFFFF" }}
                            className="rounded-lg bg-blue-950 px-3 py-2 text-xs font-black"
                          >
                            Relatório
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <p className="mt-5 rounded-xl bg-white px-4 py-3 text-xs font-semibold leading-5 text-slate-500 shadow-sm">
              Privacidade: este painel usa somente estatísticas anônimas e não armazena dados pessoais dos visitantes.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
