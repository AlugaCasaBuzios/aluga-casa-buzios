import Link from "next/link";
import { notFound } from "next/navigation";

import CopyLinkButton from "@/components/admin/CopyLinkButton";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  buildIcalExportPath,
  ensureIcalExport,
} from "@/lib/availability/icalExport";
import {
  getPriceCalendar,
  getTodayInBuzios,
  type NightAvailability,
} from "@/lib/pricing/getPriceCalendar";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

import {
  confirmPricingReviewed,
  regenerateIcalLink,
} from "../actions";

export const dynamic = "force-dynamic";

const CALENDAR_DAYS = 90;

type PropertyPricesPageProps = {
  params: Promise<{
    propertyId: string;
  }>;

  searchParams: Promise<{
    revisado?: string;
    ical?: string;
    erro?: string;
  }>;
};

const WEEKDAYS = [
  "dom",
  "seg",
  "ter",
  "qua",
  "qui",
  "sex",
  "sáb",
];

const availabilityBadges: Record<
  NightAvailability,
  {
    label: string;
    className: string;
  }
> = {
  livre: {
    label: "Livre",
    className: "bg-green-100 text-green-800",
  },
  airbnb: {
    label: "Ocupado (Airbnb)",
    className: "bg-slate-200 text-slate-700",
  },
  manual: {
    label: "Bloqueio manual",
    className: "bg-amber-100 text-amber-900",
  },
};

function formatCurrency(
  value: number
): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function formatDate(
  date: string
): string {
  const [year, month, day] =
    date.split("-");

  return `${day}/${month}/${year}`;
}

function formatDateTime(
  value: string
): string {
  return new Date(value).toLocaleString(
    "pt-BR",
    {
      timeZone: "America/Sao_Paulo",
      dateStyle: "short",
      timeStyle: "short",
    }
  );
}

export default async function PropertyPricesPage({
  params,
  searchParams,
}: PropertyPricesPageProps) {
  const { propertyId } = await params;
  const { revisado, ical, erro } =
    await searchParams;

  await requireAdmin();

  const supabase =
    createSupabaseAdminClient();

  const { data: pricing } = await supabase
    .from("property_pricing")
    .select(
      "property_id, property_name, pricing_reviewed_at"
    )
    .eq("property_id", propertyId)
    .maybeSingle();

  if (!pricing) {
    notFound();
  }

  const [calendar, icalExport] =
    await Promise.all([
      getPriceCalendar(
        propertyId,
        getTodayInBuzios(),
        CALENDAR_DAYS
      ),
      ensureIcalExport(propertyId),
    ]);

  const icalPath = icalExport
    ? buildIcalExportPath(
        propertyId,
        icalExport.token
      )
    : null;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/precos"
          className="mb-6 inline-flex font-semibold text-blue-950 hover:underline"
        >
          ← Voltar para a revisão de preços
        </Link>

        <header className="mb-8 rounded-3xl bg-blue-950 p-8 text-white shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            Preços e calendário
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            {pricing.property_name}
          </h1>

          <p className="mt-2 text-blue-100">
            Compare a tabela abaixo com o calendário do imóvel no Airbnb.
          </p>
        </header>

        {revisado === "1" && (
          <p className="mb-6 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
            Revisão registrada. O imóvel sai do próximo lembrete.
          </p>
        )}

        {ical === "novo" && (
          <p className="mb-6 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
            Novo link iCal gerado. O link anterior não funciona mais:
            atualize-o no Airbnb.
          </p>
        )}

        {erro && (
          <p
            role="alert"
            className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            {erro === "ical"
              ? "Não foi possível gerar um novo link iCal."
              : "Não foi possível registrar a revisão."}
          </p>
        )}

        <section className="mb-8 rounded-3xl bg-white p-6 shadow-lg sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            Conferência com o Airbnb
          </h2>

          <p className="mt-2 text-slate-600">
            {pricing.pricing_reviewed_at
              ? `Última conferência: ${formatDateTime(
                  pricing.pricing_reviewed_at
                )}.`
              : "Os preços deste imóvel ainda não foram conferidos."}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Se algum valor da coluna &quot;Airbnb&quot; estiver diferente,
            corrija em{" "}
            <Link
              href={`/admin/imoveis/${encodeURIComponent(
                propertyId
              )}#precos-imovel`}
              className="font-semibold text-blue-900 hover:underline"
            >
              preço-base
            </Link>
            ,{" "}
            <Link
              href="/admin/periodos"
              className="font-semibold text-blue-900 hover:underline"
            >
              períodos especiais
            </Link>{" "}
            ou{" "}
            <Link
              href="/admin/precos-por-data"
              className="font-semibold text-blue-900 hover:underline"
            >
              preços por data
            </Link>
            . Salvar qualquer um deles também conta como conferência.
          </p>

          <form
            action={confirmPricingReviewed}
            className="mt-5"
          >
            <input
              type="hidden"
              name="propertyId"
              value={propertyId}
            />

            <button
              type="submit"
              className="rounded-xl bg-green-700 px-6 py-3 font-bold text-white transition hover:bg-green-800"
            >
              Conferi, preços estão iguais ao Airbnb
            </button>
          </form>
        </section>

        <section className="mb-8 rounded-3xl bg-white p-6 shadow-lg sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            Próximas {CALENDAR_DAYS} noites
          </h2>

          {calendar && (
            <p className="mt-2 text-sm text-slate-600">
              {calendar.siteDiscountPercent > 0
                ? `O site cobra ${calendar.siteDiscountPercent}% a menos que o Airbnb.`
                : "O site cobra o mesmo valor do Airbnb."}{" "}
              {calendar.dynamicRulesEnabled
                ? "Ajustes automáticos ligados."
                : "Ajustes automáticos desligados."}
            </p>
          )}

          {calendar?.warnings.map((warning) => (
            <p
              key={warning}
              className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
            >
              {warning}
            </p>
          ))}

          {!calendar ? (
            <p className="mt-4 text-red-700">
              Não foi possível calcular os preços deste imóvel.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Noite</th>
                    <th className="px-4 py-3">Airbnb</th>
                    <th className="px-4 py-3">Site</th>
                    <th className="px-4 py-3">Mín. noites</th>
                    <th className="px-4 py-3">Origem</th>
                    <th className="px-4 py-3">Situação</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {calendar.nights.map((night) => {
                    const badge =
                      availabilityBadges[
                        night.availability
                      ];

                    return (
                      <tr
                        key={night.date}
                        className={
                          night.weekday === 0 ||
                          night.weekday === 6
                            ? "bg-slate-50/60"
                            : undefined
                        }
                      >
                        <td className="px-4 py-2 font-semibold text-slate-900">
                          {formatDate(night.date)}{" "}
                          <span className="font-normal text-slate-500">
                            {WEEKDAYS[night.weekday]}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {formatCurrency(night.airbnbPrice)}
                        </td>
                        <td className="px-4 py-2 font-semibold text-blue-950">
                          {formatCurrency(night.sitePrice)}
                        </td>
                        <td className="px-4 py-2">
                          {night.minimumNights}
                        </td>
                        <td className="px-4 py-2 text-slate-600">
                          {night.sourceLabel}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section
          id="ical"
          className="scroll-mt-28 rounded-3xl bg-white p-6 shadow-lg sm:p-8"
        >
          <h2 className="text-xl font-bold text-slate-900">
            Link iCal para o Airbnb
          </h2>

          <p className="mt-2 text-slate-600">
            Este link envia ao Airbnb apenas os bloqueios manuais deste
            imóvel, com o título &quot;Bloqueado&quot;. Motivos e dados de
            hóspedes nunca são enviados, e as reservas que já vieram do Airbnb
            não são reenviadas.
          </p>

          {!icalPath ? (
            <p className="mt-4 text-red-700">
              Não foi possível carregar o link iCal.
            </p>
          ) : (
            <>
              <p className="mt-4 break-all rounded-xl bg-slate-100 px-4 py-3 font-mono text-xs text-slate-800">
                {icalPath}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Trate este link como uma senha: quem o tiver vê as datas
                bloqueadas.
                {icalExport?.lastFetchedAt
                  ? ` Último acesso: ${formatDateTime(
                      icalExport.lastFetchedAt
                    )}.`
                  : " Ainda não foi acessado."}
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <CopyLinkButton
                  path={icalPath}
                  label="Copiar link iCal"
                />

                <form action={regenerateIcalLink}>
                  <input
                    type="hidden"
                    name="propertyId"
                    value={propertyId}
                  />

                  <button
                    type="submit"
                    className="w-full rounded-xl border border-red-300 px-5 py-3 font-bold text-red-700 transition hover:bg-red-50"
                  >
                    Gerar novo link (invalida o atual)
                  </button>
                </form>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
