import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type ManualBlocksPageProps = {
  searchParams: Promise<{
    criado?: string;
    salvo?: string;
    excluido?: string;
  }>;
};

type ManualAvailabilityBlock = {
  id: string;
  property_id: string;
  start_date: string;
  end_date_exclusive: string;
  reason: string | null;
  active: boolean;
};

type PropertyPricing = {
  property_id: string;
  property_name: string;
};

function formatDate(
  date: string
): string {
  const [year, month, day] =
    date.split("-");

  return `${day}/${month}/${year}`;
}

export default async function ManualBlocksPage({
  searchParams,
}: ManualBlocksPageProps) {
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
    blocksResult,
    propertiesResult,
  ] = await Promise.all([
    supabase
      .from("manual_availability_blocks")
      .select(`
        id,
        property_id,
        start_date,
        end_date_exclusive,
        reason,
        active
      `)
      .order("start_date", {
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

  if (blocksResult.error) {
    console.error(
      "Erro ao carregar bloqueios:",
      blocksResult.error
    );

    return (
      <main className="min-h-screen bg-slate-100 px-4 py-12">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-red-700">
            Não foi possível carregar os bloqueios
          </h1>

          <p className="mt-3 text-slate-600">
            Verifique a conexão e as permissões da
            tabela manual_availability_blocks.
          </p>

          <Link
            href="/admin"
            className="mt-6 inline-flex rounded-xl bg-blue-950 px-5 py-3 font-bold"
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

  const blocks =
    (blocksResult.data ??
      []) as ManualAvailabilityBlock[];

  const properties =
    (propertiesResult.data ??
      []) as PropertyPricing[];

  const propertyNames =
    new Map(
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
                Bloqueios manuais
              </h1>

              <p className="mt-2 text-blue-100">
                Manutenção, uso do proprietário e reservas externas
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin/bloqueios/novo"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 py-3 text-center font-bold shadow-sm transition hover:bg-blue-100"
                style={{
                  color: "#172554",
                }}
              >
                Novo bloqueio
              </Link>

              <Link
                href="/admin"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-center font-bold transition hover:bg-white"
                style={{
                  color: "#ffffff",
                }}
              >
                Voltar ao painel
              </Link>
            </div>
          </div>
        </header>

        {criado === "1" && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-800">
            Bloqueio cadastrado com sucesso.
          </div>
        )}

        {salvo === "1" && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-800">
            Bloqueio atualizado com sucesso.
          </div>
        )}

        {excluido === "1" && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-800">
            Bloqueio excluído com sucesso.
          </div>
        )}

        <section className="overflow-hidden rounded-3xl bg-white shadow-lg">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-bold text-slate-900">
              Bloqueios cadastrados
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              {blocks.length} bloqueios encontrados
            </p>
          </div>

          {blocks.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <h3 className="text-lg font-bold text-slate-900">
                Nenhum bloqueio cadastrado
              </h3>

              <p className="mt-2 text-slate-600">
                Cadastre um período indisponível para
                um dos imóveis.
              </p>

              <Link
                href="/admin/bloqueios/novo"
                className="mt-6 inline-flex rounded-xl bg-blue-950 px-6 py-3 font-bold transition hover:bg-blue-900"
                style={{
                  color: "#ffffff",
                }}
              >
                Cadastrar bloqueio
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left">
                <thead className="bg-slate-50 text-sm text-slate-700">
                  <tr>
                    <th className="px-5 py-4">
                      Imóvel
                    </th>

                    <th className="px-5 py-4">
                      Entrada
                    </th>

                    <th className="px-5 py-4">
                      Saída
                    </th>

                    <th className="px-5 py-4">
                      Motivo
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
                  {blocks.map((block) => (
                    <tr
                      key={block.id}
                      className="text-sm text-slate-700"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {propertyNames.get(
                            block.property_id
                          ) ??
                            block.property_id}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {block.property_id}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {formatDate(
                          block.start_date
                        )}
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {formatDate(
                          block.end_date_exclusive
                        )}
                      </td>

                      <td className="max-w-sm px-5 py-4">
                        {block.reason ??
                          "Sem motivo informado"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            block.active
                              ? "bg-red-100 text-red-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {block.active
                            ? "Bloqueado"
                            : "Inativo"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/bloqueios/${block.id}`}
                          className="inline-flex items-center justify-center rounded-lg bg-blue-950 px-5 py-2.5 font-bold shadow-sm transition hover:bg-blue-900"
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