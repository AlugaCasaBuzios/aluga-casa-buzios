import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams: Promise<{
    salvo?: string;
    erro?: string;
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

function formatCurrency(value: number | null) {
  if (value === null) {
    return "Não definido";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default async function AdminPage({
  searchParams,
}: AdminPageProps) {
  const { salvo } = await searchParams;

  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data, error } = await supabase
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
    .order("property_name");

  if (error) {
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
        </div>
      </main>
    );
  }

  const properties =
    (data ?? []) as PropertyPricing[];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-3xl bg-blue-950 p-8 text-white shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            Aluga Casa Búzios
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Painel administrativo
          </h1>

          <p className="mt-2 text-blue-100">
            Gerenciamento de preços e regras dos imóveis
          </p>
        </header>

        {salvo === "1" && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-800">
            Alterações salvas com sucesso.
          </div>
        )}

        <section className="overflow-hidden rounded-3xl bg-white shadow-lg">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-bold text-slate-900">
              Imóveis cadastrados
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              {properties.length} imóveis encontrados
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="bg-slate-50 text-sm text-slate-700">
                <tr>
                  <th className="px-5 py-4">
                    Imóvel
                  </th>

                  <th className="px-5 py-4">
                    Preço-base
                  </th>

                  <th className="px-5 py-4">
                    Limpeza
                  </th>

                  <th className="px-5 py-4">
                    Mínimo de noites
                  </th>

                  <th className="px-5 py-4">
                    Preço mínimo
                  </th>

                  <th className="px-5 py-4">
                    Preço máximo
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
                {properties.map((property) => (
                  <tr
                    key={property.property_id}
                    className="text-sm text-slate-700"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {property.property_name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {property.property_id}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {formatCurrency(
                        property.base_price
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {formatCurrency(
                        property.cleaning_fee
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {property.minimum_nights ??
                        "Não definido"}
                    </td>

                    <td className="px-5 py-4">
                      {formatCurrency(
                        property.minimum_price
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {formatCurrency(
                        property.maximum_price
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          property.active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {property.active
                          ? "Ativo"
                          : "Inativo"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/imoveis/${property.property_id}`}
                        className="inline-flex rounded-lg bg-blue-950 px-4 py-2 font-bold text-white transition hover:bg-blue-900"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}