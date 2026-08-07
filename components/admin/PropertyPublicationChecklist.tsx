import type {
  PropertyPublicationChecklist as PublicationChecklist,
  PropertyPublicationChecklistItem,
} from "@/lib/propertyPublicationChecklist";

type PropertyPublicationChecklistProps = {
  checklist: PublicationChecklist;
};

function getSectionHref(
  item: PropertyPublicationChecklistItem
): string {
  switch (item.section) {
    case "fotos":
      return "#fotos-imovel";

    case "precos":
      return "#precos-imovel";

    default:
      return "#dados-imovel";
  }
}

export default function PropertyPublicationChecklist({
  checklist,
}: PropertyPublicationChecklistProps) {
  const percentage = Math.round(
    (
      checklist.completeCount /
      checklist.totalCount
    ) * 100
  );

  return (
    <section
      id="checklist-publicacao"
      aria-labelledby="checklist-publicacao-title"
      className={`mb-8 scroll-mt-28 rounded-2xl border p-5 ${
        checklist.ready
          ? "border-green-200 bg-green-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p
            className={`text-sm font-black uppercase tracking-wider ${
              checklist.ready
                ? "text-green-700"
                : "text-amber-800"
            }`}
          >
            Checklist de publicação
          </p>

          <h2
            id="checklist-publicacao-title"
            className="mt-1 text-2xl font-bold text-slate-900"
          >
            {checklist.ready
              ? "Imóvel pronto para ativar"
              : "Complete o imóvel antes de ativar"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-700">
            {checklist.completeCount} de{" "}
            {checklist.totalCount} itens concluídos.
            A ativação fica bloqueada enquanto houver
            pendências.
          </p>
        </div>

        <span
          className={`inline-flex self-start rounded-full px-4 py-2 text-sm font-black ${
            checklist.ready
              ? "bg-green-700 text-white"
              : "bg-amber-200 text-amber-950"
          }`}
        >
          {percentage}% concluído
        </span>
      </div>

      <div
        className="mt-5 h-3 overflow-hidden rounded-full bg-white"
        role="progressbar"
        aria-label="Progresso do checklist de publicação"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      >
        <div
          className={`h-full rounded-full transition-all ${
            checklist.ready
              ? "bg-green-700"
              : "bg-amber-500"
          }`}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {checklist.items.map(
          (item) => (
            <a
              key={item.id}
              href={getSectionHref(item)}
              className={`rounded-xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${
                item.complete
                  ? "border-green-200"
                  : "border-amber-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                    item.complete
                      ? "bg-green-100 text-green-800"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {item.complete
                    ? "✓"
                    : "!"}
                </span>

                <span>
                  <span className="block font-bold text-slate-900">
                    {item.label}
                  </span>

                  <span className="mt-1 block text-sm leading-5 text-slate-600">
                    {item.description}
                  </span>
                </span>
              </div>
            </a>
          )
        )}
      </div>
    </section>
  );
}
