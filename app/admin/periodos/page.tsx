import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type SpecialPeriodsPageProps = {
  searchParams: Promise<{
    salvo?: string;
    erro?: string;
  }>;
};

type SpecialPricingRule = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  multiplier: number | string;
  minimum_nights: number;
  priority: number;
  label: string;
  active: boolean;
};

function formatDate(date: string): string {
  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}`;
}

function formatPercentage(
  multiplier: number | string
): string {
  const numericMultiplier = Number(multiplier);

  const percentage =
    (numericMultiplier - 1) * 100;

  return `${percentage.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  })}%`;
}

export default async function SpecialPeriodsPage({
  searchParams,
}: SpecialPeriodsPageProps) {
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
    .from("special_pricing_rules")
    .select(`
      id,
      name,
      start_date,
      end_date,
      multiplier,
      minimum_nights,
      priority,
      label,
      active
    `)
    .order("start_date", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Erro ao carregar os períodos:",
      error
    );

    return (
      <main className="min-h-screen bg-slate-100 px-4 py-12">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-red-700">
            Não foi possível carregar os períodos
          </h1>

          <p className="mt-3 text-slate-600">
            Verifique as permissões da tabela
            special_pricing_rules no Supabase.
          </p>

          <Link
            href="/admin"
            className="mt-6 inline-flex rounded-xl bg-blue-950 px-5 py-3 font-bold text-white"
          >
            Voltar ao painel
          </Link>
        </div>
      </main>
    );
  }

  const periods =
    (data ?? []) as SpecialPricingRule[];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-3xl bg-blue-950 p-8 text-white shadow-lg">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                Aluga Casa Búzios
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Períodos especiais
              </h1>

              <p className="mt-2 text-blue-100">
                Feriados, alta temporada e datas comemorativas
              </p>
            </div>

            <Link
              href="/admin"
              className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-center font-bold text-white transition hover:bg-white hover:text-blue-950"
            >
              Voltar ao painel
            </Link>
          </div>
        </header>

        {salvo === "1" && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-800">
            Período atualizado com sucesso.
          </div>
        )}

        <section className="overflow-hidden rounded-3xl bg-white shadow-lg">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-bold text-slate-900">
              Regras cadastradas
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              {periods.length} períodos encontrados
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left">
              <thead className="bg-slate-50 text-sm text-slate-700">
                <tr>
                  <th className="px-5 py-4">
                    Período
                  </th>

                  <th className="px-5 py-4">
                    Datas
                  </th>

                  <th className="px-5 py-4">
                    Acréscimo
                  </th>

                  <th className="px-5 py-4">
                    Mínimo de noites
                  </th>

                  <th className="px-5 py-4">
                    Prioridade
                  </th>

                  <th className="px-5 py-4">
                    Categoria
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
                {periods.map((period) => (
                  <tr
                    key={period.id}
                    className="text-sm text-slate-700"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {period.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {period.id}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p>
                        {formatDate(
                          period.start_date
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        até{" "}
                        {formatDate(
                          period.end_date
                        )}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-semibold text-green-700">
                      +{" "}
                      {formatPercentage(
                        period.multiplier
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {period.minimum_nights}
                    </td>

                    <td className="px-5 py-4">
                      {period.priority}
                    </td>

                    <td className="px-5 py-4">
                      {period.label}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          period.active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {period.active
                          ? "Ativo"
                          : "Inativo"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/periodos/${period.id}`}
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