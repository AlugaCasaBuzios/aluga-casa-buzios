import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { updatePropertyPricing } from "./actions";

export const dynamic = "force-dynamic";

type EditPropertyPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
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

function getErrorMessage(error?: string) {
  switch (error) {
    case "preco-base":
      return "Informe um preço-base maior que zero.";

    case "limpeza":
      return "A taxa de limpeza não pode ser negativa.";

    case "minimo-noites":
      return "O mínimo de noites deve ser um número inteiro maior que zero.";

    case "preco-minimo":
      return "O preço mínimo deve ser maior que zero.";

    case "preco-maximo":
      return "O preço máximo deve ser maior que zero.";

    case "intervalo":
      return "O preço mínimo não pode ser maior que o preço máximo.";

    case "salvar":
      return "Não foi possível salvar as alterações.";

    default:
      return null;
  }
}

export default async function EditPropertyPage({
  params,
  searchParams,
}: EditPropertyPageProps) {
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
    .eq("property_id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const property =
    data as PropertyPricing;

  const errorMessage =
    getErrorMessage(erro);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin"
          className="mb-6 inline-flex font-semibold text-blue-950 hover:underline"
        >
          ← Voltar para o painel
        </Link>

        <section className="rounded-3xl bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-8 border-b border-slate-200 pb-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-900">
              Aluga Casa Búzios
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Editar imóvel
            </h1>

            <p className="mt-3 text-lg font-semibold text-slate-700">
              {property.property_name}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {property.property_id}
            </p>
          </div>

          {errorMessage && (
            <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {errorMessage}
            </p>
          )}

          <form
            action={updatePropertyPricing}
            className="space-y-6"
          >
            <input
              type="hidden"
              name="propertyId"
              value={property.property_id}
            />

            <div>
              <label
                htmlFor="basePrice"
                className="mb-2 block font-semibold text-slate-800"
              >
                Preço-base da diária
              </label>

              <input
                id="basePrice"
                name="basePrice"
                type="number"
                min="0.01"
                step="0.01"
                required
                defaultValue={property.base_price}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-200"
              />

              <p className="mt-2 text-sm text-slate-500">
                Valor principal usado pelo cálculo automático.
              </p>
            </div>

            <div>
              <label
                htmlFor="cleaningFee"
                className="mb-2 block font-semibold text-slate-800"
              >
                Taxa de limpeza
              </label>

              <input
                id="cleaningFee"
                name="cleaningFee"
                type="number"
                min="0"
                step="0.01"
                defaultValue={
                  property.cleaning_fee ?? ""
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-200"
                placeholder="Exemplo: 300"
              />
            </div>

            <div>
              <label
                htmlFor="minimumNights"
                className="mb-2 block font-semibold text-slate-800"
              >
                Mínimo padrão de noites
              </label>

              <input
                id="minimumNights"
                name="minimumNights"
                type="number"
                min="1"
                step="1"
                defaultValue={
                  property.minimum_nights ?? ""
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-200"
                placeholder="Exemplo: 2"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="minimumPrice"
                  className="mb-2 block font-semibold text-slate-800"
                >
                  Preço mínimo
                </label>

                <input
                  id="minimumPrice"
                  name="minimumPrice"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={
                    property.minimum_price ?? ""
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-200"
                  placeholder="Valor mínimo permitido"
                />
              </div>

              <div>
                <label
                  htmlFor="maximumPrice"
                  className="mb-2 block font-semibold text-slate-800"
                >
                  Preço máximo
                </label>

                <input
                  id="maximumPrice"
                  name="maximumPrice"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={
                    property.maximum_price ?? ""
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-200"
                  placeholder="Valor máximo permitido"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <input
                name="active"
                type="checkbox"
                defaultChecked={property.active}
                className="h-5 w-5 rounded border-slate-300"
              />

              <span>
                <span className="block font-semibold text-slate-900">
                  Imóvel ativo
                </span>

                <span className="block text-sm text-slate-600">
                  Permite que este imóvel utilize as configurações do painel.
                </span>
              </span>
            </label>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row">
              <button
                type="submit"
                className="rounded-xl bg-blue-950 px-6 py-3 font-bold text-white transition hover:bg-blue-900"
              >
                Salvar alterações
              </button>

              <Link
                href="/admin"
                className="rounded-xl border border-slate-300 px-6 py-3 text-center font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}