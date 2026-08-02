import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

import {
  updateDatePricingOverride,
} from "./actions";

import {
  DeleteDatePricingButton,
} from "./DeleteDatePricingButton";

export const dynamic = "force-dynamic";

type EditDatePricingPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    erro?: string;
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

const errorMessages: Record<string, string> = {
  imovel:
    "Selecione um imóvel válido.",

  data:
    "Informe uma data válida.",

  preco:
    "O preço manual precisa ser maior que zero.",

  noites:
    "O mínimo de noites precisa ser um número inteiro maior que zero.",

  valores:
    "Informe um preço manual, um mínimo de noites ou os dois.",

  duplicado:
    "Já existe uma regra para este imóvel nesta data.",

  salvar:
    "Não foi possível salvar as alterações. Tente novamente.",

  excluir:
    "Não foi possível excluir o preço por data. Tente novamente.",
};

export default async function EditDatePricingPage({
  params,
  searchParams,
}: EditDatePricingPageProps) {
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

  const [
    overrideResult,
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
      .eq("id", id)
      .maybeSingle(),

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

  if (overrideResult.error) {
    console.error(
      "Erro ao carregar preço por data:",
      overrideResult.error
    );

    return (
      <main className="min-h-screen bg-slate-100 px-4 py-12">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-red-700">
            Não foi possível carregar o preço por data
          </h1>

          <p className="mt-3 text-slate-600">
            Verifique a conexão e as permissões do
            Supabase.
          </p>

          <Link
            href="/admin/precos-por-data"
            className="mt-6 inline-flex rounded-xl bg-blue-950 px-5 py-3 font-bold text-white"
          >
            Voltar aos preços por data
          </Link>
        </div>
      </main>
    );
  }

  if (!overrideResult.data) {
    notFound();
  }

  if (propertiesResult.error) {
    console.error(
      "Erro ao carregar os imóveis:",
      propertiesResult.error
    );

    return (
      <main className="min-h-screen bg-slate-100 px-4 py-12">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-red-700">
            Não foi possível carregar os imóveis
          </h1>

          <Link
            href="/admin/precos-por-data"
            className="mt-6 inline-flex rounded-xl bg-blue-950 px-5 py-3 font-bold text-white"
          >
            Voltar aos preços por data
          </Link>
        </div>
      </main>
    );
  }

  const override =
    overrideResult.data as DatePricingOverride;

  const properties =
    (propertiesResult.data ??
      []) as PropertyPricing[];

  const currentProperty =
    properties.find(
      (property) =>
        property.property_id ===
        override.property_id
    );

  const propertyName =
    currentProperty?.property_name ??
    override.property_id;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 rounded-3xl bg-blue-950 p-8 text-white shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            Aluga Casa Búzios
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Editar preço por data
          </h1>

          <p className="mt-2 text-blue-100">
            {propertyName} — {override.pricing_date}
          </p>
        </header>

        {erro && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-semibold text-red-800">
            {errorMessages[erro] ??
              "Verifique os dados informados."}
          </div>
        )}

        <form
          action={updateDatePricingOverride}
          className="rounded-3xl bg-white p-6 shadow-lg sm:p-8"
        >
          <input
            type="hidden"
            name="id"
            value={override.id}
          />

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
                defaultValue={
                  override.property_id
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
              >
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

            <div className="md:col-span-2">
              <label
                htmlFor="pricingDate"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                Data
              </label>

              <input
                id="pricingDate"
                name="pricingDate"
                type="date"
                required
                defaultValue={
                  override.pricing_date
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="manualPrice"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                Preço manual
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-semibold text-slate-500">
                  R$
                </span>

                <input
                  id="manualPrice"
                  name="manualPrice"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={
                    override.manual_price ??
                    ""
                  }
                  className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Este valor substitui o cálculo
                automático da diária.
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
                min="1"
                step="1"
                defaultValue={
                  override.minimum_nights ??
                  ""
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                Este mínimo prevalece para reservas
                que incluam a data.
              </p>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="notes"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                Observações
              </label>

              <textarea
                id="notes"
                name="notes"
                rows={4}
                defaultValue={
                  override.notes ?? ""
                }
                placeholder="Observações sobre o ajuste"
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="md:col-span-2">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900">
                É necessário manter pelo menos um
                campo preenchido:{" "}
                <strong>preço manual</strong> ou{" "}
                <strong>mínimo de noites</strong>.
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={
                    override.active
                  }
                  className="h-5 w-5 rounded border-slate-300"
                />

                <span>
                  <span className="block font-bold text-slate-900">
                    Regra ativa
                  </span>

                  <span className="mt-1 block text-sm text-slate-600">
                    Quando desmarcada, esta regra
                    deixa de participar do cálculo.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/admin/precos-por-data"
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

        <section className="mt-8 rounded-3xl border border-red-200 bg-white p-6 shadow-lg sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-red-700">
                Excluir preço por data
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Esta ação remove definitivamente a
                regra e não poderá ser desfeita.
              </p>
            </div>

            <DeleteDatePricingButton
              id={override.id}
              propertyName={propertyName}
              pricingDate={
                override.pricing_date
              }
            />
          </div>
        </section>
      </div>
    </main>
  );
}