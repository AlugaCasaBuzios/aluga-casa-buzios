import Link from "next/link";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { PRICE_REVIEW_THRESHOLD_DAYS } from "@/lib/pricing/priceReviewReminder";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type PricingRow = {
  property_id: string;
  property_name: string;
  base_price: number | string;
  site_discount_percent: number | string;
  pricing_reviewed_at: string | null;
  active: boolean;
};

function formatCurrency(
  value: number
): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getReviewStatus(
  reviewedAt: string | null
): {
  label: string;
  className: string;
} {
  if (!reviewedAt) {
    return {
      label: "Nunca conferido",
      className: "bg-red-100 text-red-800",
    };
  }

  const days = Math.floor(
    (Date.now() -
      new Date(reviewedAt).getTime()) /
      86_400_000
  );

  if (days > PRICE_REVIEW_THRESHOLD_DAYS) {
    return {
      label: `Conferido há ${days} dias`,
      className: "bg-amber-100 text-amber-900",
    };
  }

  return {
    label:
      days === 0
        ? "Conferido hoje"
        : `Conferido há ${days} ${days === 1 ? "dia" : "dias"}`,
    className: "bg-green-100 text-green-800",
  };
}

export default async function PricingReviewPage() {
  await requireAdmin();

  const supabase =
    createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("property_pricing")
    .select(`
      property_id,
      property_name,
      base_price,
      site_discount_percent,
      pricing_reviewed_at,
      active
    `)
    .order("property_name", {
      ascending: true,
    });

  const rows = (data ?? []) as PricingRow[];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin"
          className="mb-6 inline-flex font-semibold text-blue-950 hover:underline"
        >
          ← Voltar para o painel
        </Link>

        <header className="mb-8 rounded-3xl bg-blue-950 p-8 text-white shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            Aluga Casa Búzios
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Revisão de preços
          </h1>

          <p className="mt-2 text-blue-100">
            Confira os preços de cada imóvel com o Airbnb pelo menos a cada{" "}
            {PRICE_REVIEW_THRESHOLD_DAYS} dias.
          </p>
        </header>

        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/admin/configuracoes"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 transition hover:bg-slate-50"
          >
            Lembrete semanal por e-mail
          </Link>

          <Link
            href="/admin/periodos"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 transition hover:bg-slate-50"
          >
            Períodos especiais
          </Link>

          <Link
            href="/admin/precos-por-data"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 transition hover:bg-slate-50"
          >
            Preços por data
          </Link>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            Não foi possível carregar os imóveis.
          </p>
        )}

        <section className="overflow-hidden rounded-3xl bg-white shadow-lg">
          <ul className="divide-y divide-slate-200">
            {rows.map((row) => {
              const status = getReviewStatus(
                row.pricing_reviewed_at
              );

              const discount = Number(
                row.site_discount_percent ?? 0
              );

              return (
                <li key={row.property_id}>
                  <Link
                    href={`/admin/precos/${encodeURIComponent(
                      row.property_id
                    )}`}
                    className="flex flex-col gap-3 px-6 py-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>
                      <span className="block font-bold text-slate-900">
                        {row.property_name}
                        {!row.active && (
                          <span className="ml-2 text-xs font-semibold text-slate-500">
                            (preços inativos)
                          </span>
                        )}
                      </span>

                      <span className="mt-1 block text-sm text-slate-600">
                        Preço-base{" "}
                        {formatCurrency(
                          Number(row.base_price)
                        )}
                        {discount > 0
                          ? ` · desconto do site ${discount}%`
                          : " · sem desconto no site"}
                      </span>
                    </span>

                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-bold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}
