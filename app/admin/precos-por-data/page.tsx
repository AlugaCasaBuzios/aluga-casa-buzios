import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type DatePricingPageProps = {
  searchParams: Promise<{
    criado?: string;
    salvo?: string;
    excluido?: string;
  }>;
};

type DatePricingOverride = {
  id: string;
  property_id: string;
  pricing_date: string;
  manual_price: number | string | null;
  minimum_nights: number | null;
  notes: string | null;
  active: boolean;
};

type PropertyPricing = {
  property_id: string;
  property_name: string;
};

function formatDate(date: string): string {
  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}`;
}

function formatCurrency(
  value: number | string | null
): string {
  if (value === null) {
    return "Não definido";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export default async function DatePricingPage({
  searchParams,
}: DatePricingPageProps) {
  const {
    criado,
    salvo,
    excluido,
  } = await searchParams;

  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const [
    overridesResult,
    propertiesResult,
  ] = await Promise.all([
    supabase
      .from("date_pricing_overrides")
      .select(`
        id,
        property_id,
        pricing_date,
        manual_price,
        minimum_nights,
        notes,
        active
      `)
      .order("pricing_date", {
        ascending: true,
      }),

    supabase
      .from("property_pricing")
      .select(`
        property_id,
        property_name
      `)
      .order("property_name", {
        ascending: true,
      }),
  ]);

  if (overridesResult.error) {
    console.error(
      "Erro ao carregar preços por data:",
      overridesResult.error
    );

    return (
      <main className="min-h-screen bg-slate-100 px-4 py-12">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-red-700">
            Não foi possível carregar os preços por data
          </h1>

          <p className="mt-3 text-slate-600">
            Verifique a conexão e as permissões da
            tabela date_pricing_overrides.
          </p>

          <Link
            href="/admin"
            className="mt-6 inline-flex rounded-xl bg-blue-950 px-5 py-3 font-bold text-white"
            style={{
              color: "#ffffff",
            }}
          >
            Voltar ao painel
          </Link>
        </div>
      </main>
    );
  }

  if (propertiesResult.error) {
    console.error(
      "Erro ao carregar os imóveis:",
      propertiesResult.error
    );
  }

  const overrides =
    (overridesResult.data ??
      []) as DatePricingOverride[];

  const properties =
    (propertiesResult.data ??
      []) as PropertyPricing[];

  const propertyNames = new Map(
    properties.map((property) => [
      property.property_id,
      property.property_name,
    ])
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-3xl bg-blue-950 p-8 text-white shadow-lg">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                Aluga Casa Búzios
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Preços por data
              </h1>

              <p className="mt-2 text-blue-100">
                Valores e mínimos de noites definidos
                para datas específicas
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin/precos-por-data/novo"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 py-3 text-center font-bold shadow-sm transition hover:bg-blue-100"
                style={{
                  color: "#172554",
                }}
              >
                Novo preço por data
              </Link>

              <Link
                href="/admin"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-center font-bold text-white transition hover:bg-white hover:text-blue-950"
              >
                Voltar ao painel
              </Link>
            </div>
          </div>
        </header>

        {criado === "1" && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-800">
            Preço por data cadastrado com sucesso.
          </div>
        )}

        {salvo === "1" && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-800">
            Preço por data atualizado com sucesso.
          </div>
        )}

        {excluido === "1" && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-800">
            Preço por data excluído com sucesso.
          </div>
        )}

        <section className="overflow-hidden rounded-3xl bg-white shadow-lg">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-bold text-slate-900">
              Regras cadastradas
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              {overrides.length} preços por data encontrados
            </p>
          </div>

          {overrides.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <h3 className="text-lg font-bold text-slate-900">
                Nenhum preço por data cadastrado
              </h3>

              <p className="mt-2 text-slate-600">
                Cadastre um valor especial para uma data
                específica de um imóvel.
              </p>

              <Link
                href="/admin/precos-por-data/novo"
                className="mt-6 inline-flex rounded-xl bg-blue-950 px-6 py-3 font-bold text-white transition hover:bg-blue-900"
                style={{
                  color: "#ffffff",
                }}
              >
                Cadastrar preço por data
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-50 text-sm text-slate-700">
                  <tr>
                    <th className="px-5 py-4">
                      Imóvel
                    </th>

                    <th className="px-5 py-4">
                      Data
                    </th>

                    <th className="px-5 py-4">
                      Preço manual
                    </th>

                    <th className="px-5 py-4">
                      Mínimo de noites
                    </th>

                    <th className="px-5 py-4">
                      Observações
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {overrides.map((override) => (
                    <tr
                      key={override.id}
                      className="text-sm text-slate-700"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {propertyNames.get(
                            override.property_id
                          ) ??
                            override.property_id}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {override.property_id}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {formatDate(
                          override.pricing_date
                        )}
                      </td>

                      <td className="px-5 py-4 font-semibold text-green-700">
                        {formatCurrency(
                          override.manual_price
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {override.minimum_nights ??
                          "Não definido"}
                      </td>

                      <td className="max-w-xs px-5 py-4">
                        {override.notes ??
                          "Sem observações"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            override.active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {override.active
                            ? "Ativo"
                            : "Inativo"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/precos-por-data/${override.id}`}
                          className="inline-flex items-center justify-center rounded-lg bg-blue-950 px-4 py-2 font-bold text-white transition hover:bg-blue-900"
                          style={{
                            color: "#ffffff",
                          }}
                        >
                          Editar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}