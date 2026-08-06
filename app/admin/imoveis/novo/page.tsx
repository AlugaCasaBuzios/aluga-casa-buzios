import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

import {
  createProperty,
} from "./actions";

export const dynamic =
  "force-dynamic";

type NewPropertyPageProps = {
  searchParams: Promise<{
    erro?: string;
  }>;
};

function getErrorMessage(
  error?: string
): string | null {
  switch (error) {
    case "id":
      return "Informe um identificador válido para o imóvel.";

    case "id-existente":
      return "Já existe um imóvel com esse identificador.";

    case "titulo":
      return "Informe o título do imóvel.";

    case "bairro":
      return "Informe o bairro do imóvel.";

    case "hospedes":
      return "A quantidade de hóspedes deve ser maior que zero.";

    case "numeros":
      return "Revise os campos numéricos. Eles não podem ser negativos.";

    case "avaliacao":
      return "A avaliação deve ficar entre 0 e 5.";

    case "latitude":
      return "A latitude deve ficar entre -90 e 90.";

    case "longitude":
      return "A longitude deve ficar entre -180 e 180.";

    case "preco-base":
      return "Informe um preço-base maior que zero.";

    case "limpeza":
      return "A taxa de limpeza não pode ser negativa.";

    case "minimo-noites":
      return "Informe um mínimo de noites maior que zero.";

    case "preco-minimo":
      return "O preço mínimo deve ser maior que zero.";

    case "preco-maximo":
      return "O preço máximo deve ser maior que zero.";

    case "intervalo":
      return "O preço mínimo não pode ser maior que o preço máximo.";

    case "salvar-precos":
      return "O catálogo foi revertido porque não foi possível salvar os preços.";

    case "salvar":
      return "Não foi possível cadastrar o imóvel.";

    default:
      return null;
  }
}

const inputClassName =
  "w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-200";

const labelClassName =
  "mb-2 block font-semibold text-slate-800";

export default async function NewPropertyPage({
  searchParams,
}: NewPropertyPageProps) {
  const { erro } =
    await searchParams;

  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const errorMessage =
    getErrorMessage(erro);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-5xl">
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
              Adicionar casa
            </h1>

            <p className="mt-3 text-slate-600">
              Cadastre os dados públicos e as configurações iniciais de preço.
            </p>
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            >
              {errorMessage}
            </p>
          )}

          <form
            action={createProperty}
            className="space-y-10"
          >
            <fieldset className="space-y-6">
              <legend className="text-xl font-bold text-slate-900">
                Identificação
              </legend>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="title"
                    className={labelClassName}
                  >
                    Título
                  </label>

                  <input
                    id="title"
                    name="title"
                    required
                    className={inputClassName}
                    placeholder="Exemplo: Casa Vista do Mar"
                  />
                </div>

                <div>
                  <label
                    htmlFor="id"
                    className={labelClassName}
                  >
                    Identificador
                  </label>

                  <input
                    id="id"
                    name="id"
                    className={inputClassName}
                    placeholder="Exemplo: casa-vista-do-mar"
                  />

                  <p className="mt-2 text-sm text-slate-500">
                    Pode deixar vazio para gerar automaticamente a partir do título.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="neighborhood"
                    className={labelClassName}
                  >
                    Bairro
                  </label>

                  <input
                    id="neighborhood"
                    name="neighborhood"
                    required
                    className={inputClassName}
                    placeholder="Exemplo: Geribá"
                  />
                </div>

                <div>
                  <label
                    htmlFor="address"
                    className={labelClassName}
                  >
                    Endereço
                  </label>

                  <input
                    id="address"
                    name="address"
                    className={inputClassName}
                    placeholder="Endereço opcional"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className={labelClassName}
                >
                  Descrição
                </label>

                <textarea
                  id="description"
                  name="description"
                  rows={6}
                  className={inputClassName}
                  placeholder="Descrição completa da casa"
                />
              </div>
            </fieldset>

            <fieldset className="space-y-6">
              <legend className="text-xl font-bold text-slate-900">
                Estrutura
              </legend>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor="guests" className={labelClassName}>
                    Hóspedes
                  </label>

                  <input
                    id="guests"
                    name="guests"
                    type="number"
                    min="1"
                    step="1"
                    required
                    defaultValue="1"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label htmlFor="bedrooms" className={labelClassName}>
                    Quartos
                  </label>

                  <input
                    id="bedrooms"
                    name="bedrooms"
                    type="number"
                    min="0"
                    step="1"
                    required
                    defaultValue="0"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label htmlFor="bathrooms" className={labelClassName}>
                    Banheiros
                  </label>

                  <input
                    id="bathrooms"
                    name="bathrooms"
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    defaultValue="0"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label htmlFor="beds" className={labelClassName}>
                    Camas
                  </label>

                  <input
                    id="beds"
                    name="beds"
                    type="number"
                    min="0"
                    step="1"
                    required
                    defaultValue="0"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label htmlFor="suites" className={labelClassName}>
                    Suítes
                  </label>

                  <input
                    id="suites"
                    name="suites"
                    type="number"
                    min="0"
                    step="1"
                    required
                    defaultValue="0"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label htmlFor="area" className={labelClassName}>
                    Área em m²
                  </label>

                  <input
                    id="area"
                    name="area"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    defaultValue="0"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label htmlFor="garage" className={labelClassName}>
                    Vagas
                  </label>

                  <input
                    id="garage"
                    name="garage"
                    type="number"
                    min="0"
                    step="1"
                    required
                    defaultValue="0"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label htmlFor="beachDistance" className={labelClassName}>
                    Distância da praia
                  </label>

                  <input
                    id="beachDistance"
                    name="beachDistance"
                    className={inputClassName}
                    placeholder="Exemplo: 300 metros"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["petFriendly", "Aceita animais"],
                  ["pool", "Piscina"],
                  ["barbecue", "Churrasqueira"],
                  ["wifi", "Wi-Fi"],
                  ["airConditioning", "Ar-condicionado"],
                  ["kitchen", "Cozinha"],
                  ["washingMachine", "Máquina de lavar"],
                ].map(([name, label]) => (
                  <label
                    key={name}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <input
                      name={name}
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-300"
                    />

                    <span className="font-semibold text-slate-800">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-6">
              <legend className="text-xl font-bold text-slate-900">
                Horários e localização
              </legend>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor="checkin" className={labelClassName}>
                    Check-in
                  </label>

                  <input
                    id="checkin"
                    name="checkin"
                    type="time"
                    required
                    defaultValue="15:00"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label htmlFor="checkout" className={labelClassName}>
                    Check-out
                  </label>

                  <input
                    id="checkout"
                    name="checkout"
                    type="time"
                    required
                    defaultValue="11:00"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label htmlFor="latitude" className={labelClassName}>
                    Latitude
                  </label>

                  <input
                    id="latitude"
                    name="latitude"
                    type="number"
                    min="-90"
                    max="90"
                    step="any"
                    className={inputClassName}
                    placeholder="-22.750000"
                  />
                </div>

                <div>
                  <label htmlFor="longitude" className={labelClassName}>
                    Longitude
                  </label>

                  <input
                    id="longitude"
                    name="longitude"
                    type="number"
                    min="-180"
                    max="180"
                    step="any"
                    className={inputClassName}
                    placeholder="-41.880000"
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-6">
              <legend className="text-xl font-bold text-slate-900">
                Fotos
              </legend>

              <div>
                <label htmlFor="image" className={labelClassName}>
                  Foto principal
                </label>

                <input
                  id="image"
                  name="image"
                  className={inputClassName}
                  placeholder="URL ou caminho da imagem"
                />
              </div>

              <div>
                <label htmlFor="gallery" className={labelClassName}>
                  Galeria
                </label>

                <textarea
                  id="gallery"
                  name="gallery"
                  rows={6}
                  className={inputClassName}
                  placeholder={"Uma URL ou caminho por linha\n/imagens/casa/foto-1.jpg\n/imagens/casa/foto-2.jpg"}
                />

                <p className="mt-2 text-sm text-slate-500">
                  Nesta etapa, informe uma imagem por linha. O upload direto será configurado depois.
                </p>
              </div>
            </fieldset>

            <fieldset className="space-y-6">
              <legend className="text-xl font-bold text-slate-900">
                Comodidades, regras e pesquisa
              </legend>

              <div className="grid gap-6 lg:grid-cols-3">
                <div>
                  <label htmlFor="amenities" className={labelClassName}>
                    Comodidades
                  </label>

                  <textarea
                    id="amenities"
                    name="amenities"
                    rows={8}
                    className={inputClassName}
                    placeholder="Uma comodidade por linha"
                  />
                </div>

                <div>
                  <label htmlFor="rules" className={labelClassName}>
                    Regras
                  </label>

                  <textarea
                    id="rules"
                    name="rules"
                    rows={8}
                    className={inputClassName}
                    placeholder="Uma regra por linha"
                  />
                </div>

                <div>
                  <label htmlFor="keywords" className={labelClassName}>
                    Palavras-chave
                  </label>

                  <textarea
                    id="keywords"
                    name="keywords"
                    rows={8}
                    className={inputClassName}
                    placeholder="Uma palavra-chave por linha"
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-6">
              <legend className="text-xl font-bold text-slate-900">
                Links e avaliações
              </legend>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="airbnb" className={labelClassName}>
                    Link do Airbnb
                  </label>

                  <input
                    id="airbnb"
                    name="airbnb"
                    type="url"
                    className={inputClassName}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label htmlFor="booking" className={labelClassName}>
                    Link do Booking
                  </label>

                  <input
                    id="booking"
                    name="booking"
                    type="url"
                    className={inputClassName}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label htmlFor="whatsapp" className={labelClassName}>
                    WhatsApp
                  </label>

                  <input
                    id="whatsapp"
                    name="whatsapp"
                    className={inputClassName}
                    placeholder="Link ou número"
                  />
                </div>

                <div>
                  <label htmlFor="rating" className={labelClassName}>
                    Avaliação
                  </label>

                  <input
                    id="rating"
                    name="rating"
                    type="number"
                    min="0"
                    max="5"
                    step="0.01"
                    required
                    defaultValue="0"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label htmlFor="reviews" className={labelClassName}>
                    Quantidade de avaliações
                  </label>

                  <input
                    id="reviews"
                    name="reviews"
                    type="number"
                    min="0"
                    step="1"
                    required
                    defaultValue="0"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label htmlFor="displayOrder" className={labelClassName}>
                    Ordem de exibição
                  </label>

                  <input
                    id="displayOrder"
                    name="displayOrder"
                    type="number"
                    min="0"
                    step="1"
                    required
                    defaultValue="100"
                    className={inputClassName}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-6">
              <legend className="text-xl font-bold text-slate-900">
                Preços iniciais
              </legend>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label htmlFor="basePrice" className={labelClassName}>
                    Preço-base
                  </label>

                  <input
                    id="basePrice"
                    name="basePrice"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label htmlFor="cleaningFee" className={labelClassName}>
                    Limpeza
                  </label>

                  <input
                    id="cleaningFee"
                    name="cleaningFee"
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label htmlFor="minimumNights" className={labelClassName}>
                    Mínimo de noites
                  </label>

                  <input
                    id="minimumNights"
                    name="minimumNights"
                    type="number"
                    min="1"
                    step="1"
                    required
                    defaultValue="1"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label htmlFor="minimumPrice" className={labelClassName}>
                    Preço mínimo
                  </label>

                  <input
                    id="minimumPrice"
                    name="minimumPrice"
                    type="number"
                    min="0.01"
                    step="0.01"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label htmlFor="maximumPrice" className={labelClassName}>
                    Preço máximo
                  </label>

                  <input
                    id="maximumPrice"
                    name="maximumPrice"
                    type="number"
                    min="0.01"
                    step="0.01"
                    className={inputClassName}
                  />
                </div>
              </div>
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <input
                  name="active"
                  type="checkbox"
                  className="h-5 w-5 rounded border-slate-300"
                />

                <span>
                  <span className="block font-semibold text-slate-900">
                    Ativar imóvel
                  </span>

                  <span className="block text-sm text-slate-600">
                    Deixe desmarcado para cadastrar como rascunho.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <input
                  name="featured"
                  type="checkbox"
                  className="h-5 w-5 rounded border-slate-300"
                />

                <span>
                  <span className="block font-semibold text-slate-900">
                    Destacar imóvel
                  </span>

                  <span className="block text-sm text-slate-600">
                    Marca a casa como destaque no catálogo.
                  </span>
                </span>
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row">
              <button
                type="submit"
                className="rounded-xl bg-green-700 px-6 py-3 font-bold text-white transition hover:bg-green-800"
              >
                Cadastrar casa
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