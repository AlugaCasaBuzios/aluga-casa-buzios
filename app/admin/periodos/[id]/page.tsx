import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

import {
  updateSpecialPricingRule,
} from "./actions";

export const dynamic = "force-dynamic";

type EditSpecialPeriodPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
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

const errorMessages: Record<
  string,
  string
> = {
  nome:
    "Informe o nome do período especial.",

  datas:
    "Informe datas válidas para o período.",

  periodo:
    "A data final não pode ser anterior à data inicial.",

  multiplicador:
    "O multiplicador precisa ser maior que zero.",

  noites:
    "O mínimo de noites precisa ser um número inteiro maior que zero.",

  prioridade:
    "A prioridade precisa ser um número inteiro igual ou maior que zero.",

  categoria:
    "Informe a categoria do período.",

  salvar:
    "Não foi possível salvar as alterações. Tente novamente.",
};

export default async function EditSpecialPeriodPage({
  params,
  searchParams,
}: EditSpecialPeriodPageProps) {
  const { id } = await params;
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
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(
      "Erro ao carregar período especial:",
      error
    );

    return (
      <main className="min-h-screen bg-slate-100 px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-red-700">
            Não foi possível carregar o período
          </h1>

          <p className="mt-3 text-slate-600">
            Verifique a conexão e as permissões do
            Supabase.
          </p>

          <Link
            href="/admin/periodos"
            className="mt-6 inline-flex rounded-xl bg-blue-950 px-5 py-3 font-bold text-white"
          >
            Voltar aos períodos
          </Link>
        </div>
      </main>
    );
  }

  if (!data) {
    notFound();
  }

  const period =
    data as SpecialPricingRule;

  const multiplier =
    Number(period.multiplier);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 rounded-3xl bg-blue-950 p-8 text-white shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            Aluga Casa Búzios
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Editar período especial
          </h1>

          <p className="mt-2 text-blue-100">
            {period.name}
          </p>
        </header>

        {erro && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-semibold text-red-800">
            {errorMessages[erro] ??
              "Verifique os dados informados."}
          </div>
        )}

        <form
          action={updateSpecialPricingRule}
          className="rounded-3xl bg-white p-6 shadow-lg sm:p-8"
        >
          <input
            type="hidden"
            name="id"
            value={period.id}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                Nome do período
              </label>

              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={period.name}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="startDate"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                Data inicial
              </label>

              <input
                id="startDate"
                name="startDate"
                type="date"
                required
                defaultValue={
                  period.start_date
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="endDate"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                Data final
              </label>

              <input
                id="endDate"
                name="endDate"
                type="date"
                required
                defaultValue={
                  period.end_date
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="multiplier"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                Multiplicador do preço
              </label>

              <input
                id="multiplier"
                name="multiplier"
                type="number"
                required
                min="0.01"
                step="0.01"
                defaultValue={multiplier}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                Exemplo: 1,35 representa um
                acréscimo de 35%.
              </p>
            </div>

            <div>
              <label
                htmlFor="minimumNights"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                Mínimo de noites
              </label>

              <input
                id="minimumNights"
                name="minimumNights"
                type="number"
                required
                min="1"
                step="1"
                defaultValue={
                  period.minimum_nights
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="priority"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                Prioridade
              </label>

              <input
                id="priority"
                name="priority"
                type="number"
                required
                min="0"
                step="1"
                defaultValue={
                  period.priority
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                Quando duas regras coincidirem,
                prevalece a de maior prioridade.
              </p>
            </div>

            <div>
              <label
                htmlFor="label"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                Categoria
              </label>

              <input
                id="label"
                name="label"
                type="text"
                required
                defaultValue={period.label}
                placeholder="Exemplo: Feriado"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={
                    period.active
                  }
                  className="h-5 w-5 rounded border-slate-300"
                />

                <span>
                  <span className="block font-bold text-slate-900">
                    Período ativo
                  </span>

                  <span className="mt-1 block text-sm text-slate-600">
                    Quando desmarcado, esta regra
                    deixa de participar do cálculo.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/admin/periodos"
              className="rounded-xl border border-slate-300 px-6 py-3 text-center font-bold text-slate-700 transition hover:bg-slate-100"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-blue-950 px-6 py-3 font-bold text-white transition hover:bg-blue-900"
            >
              Salvar alterações
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}