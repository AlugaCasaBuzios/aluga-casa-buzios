import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

import { logout } from "./actions";

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

function formatCurrency(
  value: number | null
): string {
  if (value === null) {
    return "Não definido";
  }

  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(value);
}

export default async function AdminPage({
  searchParams,
}: AdminPageProps) {
  const { salvo } =
    await searchParams;

  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const adminSupabase =
    createSupabaseAdminClient();

  const [
    pricingResult,
    newProposalsResult,
  ] = await Promise.all([
    supabase
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
      .order("property_name", {
        ascending: true,
      }),

    adminSupabase
      .from(
        "property_management_leads"
      )
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "new"),
  ]);

  const {
    data,
    error,
  } = pricingResult;

  const {
    count: newProposalsCount,
    error: proposalsCountError,
  } = newProposalsResult;

  if (proposalsCountError) {
    console.error(
      "Erro ao contar propostas novas:",
      proposalsCountError
    );
  }

  const newProposals =
    newProposalsCount ?? 0;

  if (error) {
    console.error(
      "Erro ao carregar os imóveis:",
      error
    );

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

          <Link
            href="/admin"
            style={{
              color: "#ffffff",
            }}
            className="mt-6 inline-flex rounded-xl bg-blue-950 px-5 py-3 font-bold transition hover:bg-blue-900"
          >
            Tentar novamente
          </Link>
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
          <div className="flex flex-col gap-7">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                Aluga Casa Búzios
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Painel administrativo
              </h1>

              <p className="mt-2 text-blue-100">
                Gerenciamento de preços, períodos,
                disponibilidade e propostas de imóveis
              </p>
            </div>

            <nav
              aria-label="Opções do painel administrativo"
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              <Link
                href="/admin/propostas"
                style={{
                  color: "#172554",
                }}
                aria-label={
                  newProposals > 0
                    ? `Propostas de imóveis: ${newProposals} novas`
                    : "Propostas de imóveis"
                }
                className="relative inline-flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl bg-sky-300 px-5 py-3 text-center font-bold shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-200"
              >
                <span>
                  Propostas de imóveis
                </span>

                {newProposals > 0 && (
                  <span
                    style={{
                      color: "#ffffff",
                    }}
                    className="inline-flex rounded-full bg-red-600 px-3 py-1 text-xs font-black shadow-sm"
                  >
                    {newProposals}{" "}
                    {newProposals === 1
                      ? "nova"
                      : "novas"}
                  </span>
                )}
              </Link>

              <Link
                href="/admin/bloqueios"
                style={{
                  color: "#172554",
                }}
                className="inline-flex min-h-16 items-center justify-center rounded-xl bg-white px-5 py-3 text-center font-bold shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100"
              >
                Bloqueios manuais
              </Link>

              <Link
                href="/admin/precos-por-data"
                style={{
                  color: "#172554",
                }}
                className="inline-flex min-h-16 items-center justify-center rounded-xl bg-white px-5 py-3 text-center font-bold shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100"
              >
                Preços por data
              </Link>

              <Link
                href="/admin/periodos"
                style={{
                  color: "#172554",
                }}
                className="inline-flex min-h-16 items-center justify-center rounded-xl bg-white px-5 py-3 text-center font-bold shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100"
              >
                Períodos especiais
              </Link>
            </nav>

            <div className="flex justify-end">
              <form action={logout}>
                <button
                  type="submit"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3 font-bold text-white transition hover:bg-white hover:text-blue-950"
                >
                  Sair do painel
                </button>
              </form>
            </div>
          </div>
        </header>

        {salvo === "1" && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-800"
          >
            Alterações salvas com sucesso.
          </div>
        )}

        <section className="overflow-hidden rounded-3xl bg-white shadow-lg">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-bold text-slate-900">
              Imóveis cadastrados
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              {properties.length}{" "}
              {properties.length === 1
                ? "imóvel encontrado"
                : "imóveis encontrados"}
            </p>
          </div>

          {properties.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <h3 className="text-lg font-bold text-slate-900">
                Nenhum imóvel encontrado
              </h3>

              <p className="mt-2 text-slate-600">
                Não existem imóveis cadastrados na
                tabela property_pricing.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-50 text-sm text-slate-700">
                  <tr>
                    <th
                      scope="col"
                      className="px-5 py-4"
                    >
                      Imóvel
                    </th>

                    <th
                      scope="col"
                      className="px-5 py-4"
                    >
                      Preço-base
                    </th>

                    <th
                      scope="col"
                      className="px-5 py-4"
                    >
                      Limpeza
                    </th>

                    <th
                      scope="col"
                      className="px-5 py-4"
                    >
                      Mínimo de noites
                    </th>

                    <th
                      scope="col"
                      className="px-5 py-4"
                    >
                      Preço mínimo
                    </th>

                    <th
                      scope="col"
                      className="px-5 py-4"
                    >
                      Preço máximo
                    </th>

                    <th
                      scope="col"
                      className="px-5 py-4"
                    >
                      Status
                    </th>

                    <th
                      scope="col"
                      className="px-5 py-4"
                    >
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {properties.map(
                    (property) => (
                      <tr
                        key={
                          property.property_id
                        }
                        className="text-sm text-slate-700 transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {
                              property.property_name
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {
                              property.property_id
                            }
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
                            style={{
                              color: "#ffffff",
                            }}
                            className="inline-flex items-center justify-center rounded-lg bg-blue-950 px-4 py-2 font-bold transition hover:bg-blue-900"
                          >
                            Editar
                          </Link>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}