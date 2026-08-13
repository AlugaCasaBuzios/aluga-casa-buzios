import Link from "next/link";

export type VirtualTourSceneAnalytics = {
  scene_id: string;
  scene_name: string;
  views: number;
};

export type VirtualTourDailyAnalytics = {
  date: string;
  views: number;
};

export type VirtualTourAnalyticsSummary = {
  total_views: number;
  views_last_30_days: number;
  views_last_7_days: number;
  whatsapp_clicks: number;
  embedded_views: number;
  scene_ranking: VirtualTourSceneAnalytics[];
  daily_views: VirtualTourDailyAnalytics[];
};

type VirtualTourAnalyticsPanelProps = {
  summary: VirtualTourAnalyticsSummary | null;
  hasError?: boolean;
  reportPath?: string;
  overviewPath?: string;
};

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

export default function VirtualTourAnalyticsPanel({
  summary,
  hasError = false,
  reportPath,
  overviewPath,
}: VirtualTourAnalyticsPanelProps) {
  if (hasError || !summary) {
    return (
      <section className="mt-6 rounded-3xl border border-amber-300 bg-amber-50 p-6 shadow-sm">
        <h2 className="text-xl font-black text-blue-950">Estatísticas do passeio</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-amber-900">
          As estatísticas ainda não estão disponíveis. Confirme se a atualização do banco de dados desta etapa foi executada.
        </p>
      </section>
    );
  }

  const contactRate = summary.total_views > 0
    ? (summary.whatsapp_clicks / summary.total_views) * 100
    : 0;
  const maximumDailyViews = Math.max(1, ...summary.daily_views.map((day) => day.views));
  const maximumSceneViews = Math.max(1, ...summary.scene_ranking.map((scene) => scene.views));

  return (
    <section className="mt-6 rounded-3xl bg-white p-6 shadow-lg sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-sky-700">Desempenho comercial</p>
          <h2 className="mt-2 text-2xl font-black text-blue-950">Estatísticas do passeio</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Acompanhe quantas vezes o passeio foi aberto, quais ambientes despertam mais interesse e quantos visitantes clicaram no WhatsApp.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {overviewPath && (
            <Link
              href={overviewPath}
              className="rounded-full border border-blue-950 bg-white px-4 py-2 text-xs font-black text-blue-950 transition hover:bg-slate-50"
            >
              Desempenho geral
            </Link>
          )}
          {reportPath && (
            <Link
              href={reportPath}
              target="_blank"
              style={{ color: "#FFFFFF" }}
              className="rounded-full bg-blue-950 px-4 py-2 text-xs font-black transition hover:bg-blue-900"
            >
              Abrir relatório em PDF
            </Link>
          )}
          <span className="w-fit rounded-full bg-green-100 px-4 py-2 text-xs font-black text-green-900">Atualização automática</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-bold text-slate-600">Visualizações totais</p>
          <p className="mt-2 text-3xl font-black text-blue-950">{formatNumber(summary.total_views)}</p>
          <p className="mt-2 text-xs font-semibold text-slate-500">{formatNumber(summary.embedded_views)} por incorporação</p>
        </article>
        <article className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <p className="text-sm font-bold text-sky-900">Últimos 30 dias</p>
          <p className="mt-2 text-3xl font-black text-sky-800">{formatNumber(summary.views_last_30_days)}</p>
          <p className="mt-2 text-xs font-semibold text-sky-700">{formatNumber(summary.views_last_7_days)} nos últimos 7 dias</p>
        </article>
        <article className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm font-bold text-green-900">Cliques no WhatsApp</p>
          <p className="mt-2 text-3xl font-black text-green-800">{formatNumber(summary.whatsapp_clicks)}</p>
          <p className="mt-2 text-xs font-semibold text-green-700">Contatos iniciados pelo passeio</p>
        </article>
        <article className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
          <p className="text-sm font-bold text-violet-900">Cliques por visualização</p>
          <p className="mt-2 text-3xl font-black text-violet-800">
            {contactRate.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
          </p>
          <p className="mt-2 text-xs font-semibold text-violet-700">Interesse em pedir informações</p>
        </article>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <article className="rounded-2xl border border-slate-200 p-5">
          <h3 className="font-black text-blue-950">Visualizações nos últimos 14 dias</h3>
          <div className="mt-5 flex h-44 items-end gap-2 overflow-x-auto pb-1">
            {summary.daily_views.map((day) => {
              const barHeight = day.views === 0
                ? 4
                : Math.max(12, Math.round((day.views / maximumDailyViews) * 132));

              return (
                <div key={day.date} className="flex min-w-8 flex-1 flex-col items-center justify-end">
                  <span className="mb-1 text-xs font-black text-blue-950">{day.views}</span>
                  <div
                    title={`${formatShortDate(day.date)}: ${day.views} visualização(ões)`}
                    style={{ height: `${barHeight}px` }}
                    className="w-full max-w-8 rounded-t-lg bg-sky-500"
                  />
                  <span className="mt-2 -rotate-45 text-[10px] font-bold text-slate-500">{formatShortDate(day.date)}</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 p-5">
          <h3 className="font-black text-blue-950">Ambientes mais acessados</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">O ranking considera cada ambiente aberto dentro do passeio.</p>
          <div className="mt-4 space-y-4">
            {summary.scene_ranking.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm font-semibold text-slate-600">Nenhum ambiente cadastrado.</p>
            ) : summary.scene_ranking.map((scene, index) => (
              <div key={scene.scene_id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <p className="min-w-0 truncate font-black text-slate-800">{index + 1}. {scene.scene_name}</p>
                  <span className="shrink-0 font-black text-blue-950">{formatNumber(scene.views)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    style={{ width: `${Math.max(scene.views === 0 ? 0 : 5, (scene.views / maximumSceneViews) * 100)}%` }}
                    className="h-full rounded-full bg-blue-950"
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-500">
        Privacidade: estas estatísticas são anônimas e não armazenam IP, localização, nome ou dados pessoais dos visitantes.
      </p>
    </section>
  );
}
