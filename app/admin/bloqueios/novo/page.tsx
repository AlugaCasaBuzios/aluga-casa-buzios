import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

import {
  createManualAvailabilityBlock,
} from "./actions";

export const dynamic = "force-dynamic";

type NewManualBlockPageProps = {
  searchParams: Promise<{
    erro?: string;
  }>;
};

type PropertyPricing = {
  property_id: string;
  property_name: string;
};

const errorMessages: Record<string, string> = {
  imovel:
    "Selecione um imóvel válido.",

  datas:
    "Informe datas válidas para o bloqueio.",

  periodo:
    "A data de saída precisa ser posterior à data de entrada.",

  conflito:
    "Já existe um bloqueio ativo que cruza este período.",

  verificar:
    "Não foi possível verificar os bloqueios existentes.",

  salvar:
    "Não foi possível cadastrar o bloqueio. Tente novamente.",
};

export default async function NewManualBlockPage({
  searchParams,
}: NewManualBlockPageProps) {
  const { erro } = await searchParams;

  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const {
    data,
    error,
  } = await supabase
    .from("property_pricing")
    .select(`
      property_id,
      property_name
    `)
    .eq("active", true)
    .order("property_name", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Erro ao carregar os imóveis:",
      error
    );

    return (
      <main className="min-h-screen bg-slate-100 px-4 py-12">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-red-700">
            Não foi possível carregar os imóveis
          </h1>

          <p className="mt-3 text-slate-600">
            Verifique a conexão e as permissões da
            tabela property_pricing.
          </p>

          <Link
            href="/admin/bloqueios"
            className="mt-6 inline-flex rounded-xl bg-blue-950 px-5 py-3 font-bold text-white"
          >
            Voltar aos bloqueios
          </Link>
        </div>
      </main>
    );
  }

  const properties =
    (data ?? []) as PropertyPricing[];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 rounded-3xl bg-blue-950 p-8 text-white shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            Aluga Casa Búzios
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Novo bloqueio manual
          </h1>

          <p className="mt-2 text-blue-100">
            Bloqueie datas para manutenção, uso próprio
            ou reservas externas
          </p>
        </header>

        {erro && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-semibold text-red-800">
            {errorMessages[erro] ??
              "Verifique os dados informados."}
          </div>
        )}

        <form
          action={createManualAvailabilityBlock}
          className="rounded-3xl bg-white p-6 shadow-lg sm:p-8"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="propertyId"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                Imóvel
              </label>

              <select
                id="propertyId"
                name="propertyId"
                required
                defaultValue=""
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
              >
                <option
                  value=""
                  disabled
                >
                  Selecione um imóvel
                </option>

                {properties.map(
                  (property) => (
                    <option
                      key={
                        property.property_id
                      }
                      value={
                        property.property_id
                      }
                    >
                      {
                        property.property_name
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="startDate"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                Data de entrada
              </label>

              <input
                id="startDate"
                name="startDate"
                type="date"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="endDateExclusive"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                Data de saída
              </label>

              <input
                id="endDateExclusive"
                name="endDateExclusive"
                type="date"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="md:col-span-2">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900">
                A data de saída não é contada como noite
                bloqueada. Por exemplo, entrada em 10/07
                e saída em 13/07 bloqueia as noites de
                10, 11 e 12.
              </div>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="reason"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                Motivo
              </label>

              <textarea
                id="reason"
                name="reason"
                rows={4}
                placeholder="Exemplo: manutenção, uso do proprietário ou reserva direta"
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked
                  className="h-5 w-5 rounded border-slate-300"
                />

                <span>
                  <span className="block font-bold text-slate-900">
                    Bloqueio ativo
                  </span>

                  <span className="mt-1 block text-sm text-slate-600">
                    Quando marcado, o site impedirá
                    orçamentos que cruzem este período.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/admin/bloqueios"
              className="rounded-xl border border-slate-300 px-6 py-3 text-center font-bold text-slate-700 transition hover:bg-slate-100"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-blue-950 px-6 py-3 font-bold text-white transition hover:bg-blue-900"
            >
              Cadastrar bloqueio
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}