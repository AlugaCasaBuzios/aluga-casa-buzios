import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import PropertyPhotoManager from "@/components/admin/PropertyPhotoManager";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  updatePropertyDetails,
  updatePropertyPhotos,
  updatePropertyPricing,
} from "./actions";

export const dynamic = "force-dynamic";

type EditPropertyPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    erro?: string;
    dados?: string;
    fotos?: string;
    aviso?: string;
  }>;
};

type PropertyPricing = {
  property_id: string;
  property_name: string;
  base_price: number | string;
  cleaning_fee: number | string | null;
  minimum_nights: number | null;
  minimum_price: number | string | null;
  maximum_price: number | string | null;
  active: boolean;
};

type PropertyCatalog = {
  id: string;
  title: string;
  neighborhood: string;
  address: string | null;
  guests: number;
  bedrooms: number;
  bathrooms: number | string;
  beds: number;
  suites: number;
  area: number | string;
  garage: number;
  pet_friendly: boolean;
  pool: boolean;
  barbecue: boolean;
  wifi: boolean;
  air_conditioning: boolean;
  kitchen: boolean;
  washing_machine: boolean;
  beach_distance: string;
  checkin: string;
  checkout: string;
  image: string;
  gallery: string[] | null;
  description: string;
  amenities: string[] | null;
  rules: string[] | null;
  airbnb: string;
  booking: string | null;
  whatsapp: string;
  rating: number | string;
  reviews: number;
  latitude: number | null;
  longitude: number | null;
  keywords: string[] | null;
  featured: boolean;
  display_order: number;
};

const inputClassName =
  "w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-200";

const labelClassName =
  "mb-2 block font-semibold text-slate-800";

function normalizeTime(
  value: string
): string {
  return value.trim().slice(0, 5);
}

function linesToText(
  values: string[] | null
): string {
  return (values ?? []).join("\n");
}

function getErrorMessage(
  error?: string
): string | null {
  switch (error) {
    case "dados-titulo":
      return "Informe o título do imóvel.";

    case "dados-bairro":
      return "Informe o bairro do imóvel.";

    case "dados-hospedes":
      return "A quantidade de hóspedes deve ser maior que zero.";

    case "dados-numeros":
      return "Revise os campos numéricos dos dados do imóvel. Eles não podem ser negativos.";

    case "dados-avaliacao":
      return "A avaliação deve ficar entre 0 e 5.";

    case "dados-latitude":
      return "A latitude deve ficar entre -90 e 90.";

    case "dados-longitude":
      return "A longitude deve ficar entre -180 e 180.";

    case "dados-horarios":
      return "Revise os horários de check-in e check-out.";

    case "salvar-dados":
      return "Não foi possível salvar os dados do imóvel.";

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
      return "Não foi possível salvar as alterações de preço.";

    case "fotos-pendentes":
      return "Aguarde o envio das fotos terminar antes de salvar.";

    case "fotos-vazias":
      return "O imóvel precisa permanecer com pelo menos uma foto.";

    case "fotos-limite":
      return "O imóvel pode ter no máximo 25 fotos.";

    case "fotos-invalidas":
      return "Uma ou mais fotos não pertencem a este imóvel.";

    case "catalogo":
      return "Não foi possível carregar o catálogo deste imóvel.";

    case "salvar-fotos":
      return "Não foi possível salvar as alterações das fotos.";

    default:
      return null;
  }
}

export default async function EditPropertyPage({
  params,
  searchParams,
}: EditPropertyPageProps) {
  const { id } = await params;
  const {
    erro,
    dados,
    fotos,
    aviso,
  } = await searchParams;

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
    catalogResult,
  ] = await Promise.all([
    adminSupabase
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
      .maybeSingle(),

    adminSupabase
      .from("property_catalog")
      .select(`
        id,
        title,
        neighborhood,
        address,
        guests,
        bedrooms,
        bathrooms,
        beds,
        suites,
        area,
        garage,
        pet_friendly,
        pool,
        barbecue,
        wifi,
        air_conditioning,
        kitchen,
        washing_machine,
        beach_distance,
        checkin,
        checkout,
        image,
        gallery,
        description,
        amenities,
        rules,
        airbnb,
        booking,
        whatsapp,
        rating,
        reviews,
        latitude,
        longitude,
        keywords,
        featured,
        display_order
      `)
      .eq("id", id)
      .maybeSingle(),
  ]);

  if (
    pricingResult.error ||
    !pricingResult.data ||
    catalogResult.error ||
    !catalogResult.data
  ) {
    notFound();
  }

  const pricing =
    pricingResult.data as PropertyPricing;

  const catalog =
    catalogResult.data as PropertyCatalog;

  const initialPhotos = Array.from(
    new Set(
      [
        catalog.image,
        ...(catalog.gallery ?? []),
      ]
        .map((photo) => photo.trim())
        .filter(Boolean)
    )
  );

  const errorMessage =
    getErrorMessage(erro);

  const featureOptions: Array<{
    name: string;
    label: string;
    checked: boolean;
  }> = [
    {
      name: "petFriendly",
      label: "Aceita animais",
      checked: catalog.pet_friendly,
    },
    {
      name: "pool",
      label: "Piscina",
      checked: catalog.pool,
    },
    {
      name: "barbecue",
      label: "Churrasqueira",
      checked: catalog.barbecue,
    },
    {
      name: "wifi",
      label: "Wi-Fi",
      checked: catalog.wifi,
    },
    {
      name: "airConditioning",
      label: "Ar-condicionado",
      checked: catalog.air_conditioning,
    },
    {
      name: "kitchen",
      label: "Cozinha",
      checked: catalog.kitchen,
    },
    {
      name: "washingMachine",
      label: "Máquina de lavar",
      checked: catalog.washing_machine,
    },
  ];

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
              Editar imóvel
            </h1>

            <p className="mt-3 text-lg font-semibold text-slate-700">
              {catalog.title}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Identificador permanente: {catalog.id}
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

          {dados === "salvos" && (
            <p className="mb-6 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              Dados do imóvel atualizados com sucesso.
            </p>
          )}

          {fotos === "salvas" && (
            <p className="mb-6 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              Fotos atualizadas com sucesso.
            </p>
          )}

          {aviso === "limpeza" && (
            <p className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              A galeria foi salva, mas um arquivo antigo não pôde ser removido do armazenamento.
            </p>
          )}

          <nav
            aria-label="Atalhos da edição do imóvel"
            className="sticky top-4 z-20 mb-8 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur"
          >
            <p className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
              Ir direto para
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <a
                href="#dados-imovel"
                className="rounded-xl bg-green-700 px-4 py-3 text-center font-bold !text-white transition hover:bg-green-800"
              >
                Dados do imóvel
              </a>

              <a
                href="#fotos-imovel"
                className="rounded-xl bg-blue-950 px-4 py-3 text-center font-bold !text-white transition hover:bg-blue-900"
              >
                Fotos
              </a>

              <a
                href="#precos-imovel"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-bold !text-blue-950 transition hover:bg-slate-100"
              >
                Preços
              </a>
            </div>
          </nav>

          <div
            id="dados-imovel"
            className="mb-6 scroll-mt-28"
          >
            <h2 className="text-2xl font-bold text-slate-900">
              Dados públicos do imóvel
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Edite as informações exibidas nas páginas públicas. O identificador do imóvel não é alterado.
            </p>
          </div>

          <form
            action={updatePropertyDetails}
            className="space-y-10"
          >
            <input
              type="hidden"
              name="propertyId"
              value={catalog.id}
            />

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
                    defaultValue={catalog.title}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="propertyIdDisplay"
                    className={labelClassName}
                  >
                    Identificador
                  </label>

                  <input
                    id="propertyIdDisplay"
                    value={catalog.id}
                    readOnly
                    className={`${inputClassName} cursor-not-allowed bg-slate-100 text-slate-500`}
                  />

                  <p className="mt-2 text-sm text-slate-500">
                    Este campo permanece fixo para não quebrar links, fotos e preços.
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
                    defaultValue={catalog.neighborhood}
                    className={inputClassName}
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
                    defaultValue={catalog.address ?? ""}
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
                  rows={7}
                  defaultValue={catalog.description}
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
                  <label
                    htmlFor="guests"
                    className={labelClassName}
                  >
                    Hóspedes
                  </label>

                  <input
                    id="guests"
                    name="guests"
                    type="number"
                    min="1"
                    step="1"
                    required
                    defaultValue={catalog.guests}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="bedrooms"
                    className={labelClassName}
                  >
                    Quartos
                  </label>

                  <input
                    id="bedrooms"
                    name="bedrooms"
                    type="number"
                    min="0"
                    step="1"
                    required
                    defaultValue={catalog.bedrooms}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="bathrooms"
                    className={labelClassName}
                  >
                    Banheiros
                  </label>

                  <input
                    id="bathrooms"
                    name="bathrooms"
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    defaultValue={catalog.bathrooms}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="beds"
                    className={labelClassName}
                  >
                    Camas
                  </label>

                  <input
                    id="beds"
                    name="beds"
                    type="number"
                    min="0"
                    step="1"
                    required
                    defaultValue={catalog.beds}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="suites"
                    className={labelClassName}
                  >
                    Suítes
                  </label>

                  <input
                    id="suites"
                    name="suites"
                    type="number"
                    min="0"
                    step="1"
                    required
                    defaultValue={catalog.suites}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="area"
                    className={labelClassName}
                  >
                    Área em m²
                  </label>

                  <input
                    id="area"
                    name="area"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    defaultValue={catalog.area}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="garage"
                    className={labelClassName}
                  >
                    Vagas
                  </label>

                  <input
                    id="garage"
                    name="garage"
                    type="number"
                    min="0"
                    step="1"
                    required
                    defaultValue={catalog.garage}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="beachDistance"
                    className={labelClassName}
                  >
                    Distância da praia
                  </label>

                  <input
                    id="beachDistance"
                    name="beachDistance"
                    defaultValue={catalog.beach_distance}
                    className={inputClassName}
                    placeholder="Exemplo: 300 metros"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {featureOptions.map((option) => (
                  <label
                    key={option.name}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <input
                      name={option.name}
                      type="checkbox"
                      defaultChecked={option.checked}
                      className="h-5 w-5 rounded border-slate-300"
                    />

                    <span className="font-semibold text-slate-800">
                      {option.label}
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
                  <label
                    htmlFor="checkin"
                    className={labelClassName}
                  >
                    Check-in
                  </label>

                  <input
                    id="checkin"
                    name="checkin"
                    type="time"
                    required
                    defaultValue={normalizeTime(catalog.checkin)}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="checkout"
                    className={labelClassName}
                  >
                    Check-out
                  </label>

                  <input
                    id="checkout"
                    name="checkout"
                    type="time"
                    required
                    defaultValue={normalizeTime(catalog.checkout)}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="latitude"
                    className={labelClassName}
                  >
                    Latitude
                  </label>

                  <input
                    id="latitude"
                    name="latitude"
                    type="number"
                    min="-90"
                    max="90"
                    step="any"
                    defaultValue={catalog.latitude ?? ""}
                    className={inputClassName}
                    placeholder="-22.750000"
                  />
                </div>

                <div>
                  <label
                    htmlFor="longitude"
                    className={labelClassName}
                  >
                    Longitude
                  </label>

                  <input
                    id="longitude"
                    name="longitude"
                    type="number"
                    min="-180"
                    max="180"
                    step="any"
                    defaultValue={catalog.longitude ?? ""}
                    className={inputClassName}
                    placeholder="-41.880000"
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-6">
              <legend className="text-xl font-bold text-slate-900">
                Comodidades, regras e pesquisa
              </legend>

              <div className="grid gap-6 lg:grid-cols-3">
                <div>
                  <label
                    htmlFor="amenities"
                    className={labelClassName}
                  >
                    Comodidades
                  </label>

                  <textarea
                    id="amenities"
                    name="amenities"
                    rows={9}
                    defaultValue={linesToText(catalog.amenities)}
                    className={inputClassName}
                    placeholder="Uma comodidade por linha"
                  />
                </div>

                <div>
                  <label
                    htmlFor="rules"
                    className={labelClassName}
                  >
                    Regras
                  </label>

                  <textarea
                    id="rules"
                    name="rules"
                    rows={9}
                    defaultValue={linesToText(catalog.rules)}
                    className={inputClassName}
                    placeholder="Uma regra por linha"
                  />
                </div>

                <div>
                  <label
                    htmlFor="keywords"
                    className={labelClassName}
                  >
                    Palavras-chave
                  </label>

                  <textarea
                    id="keywords"
                    name="keywords"
                    rows={9}
                    defaultValue={linesToText(catalog.keywords)}
                    className={inputClassName}
                    placeholder="Uma palavra-chave por linha"
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-6">
              <legend className="text-xl font-bold text-slate-900">
                Links, avaliações e exibição
              </legend>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="airbnb"
                    className={labelClassName}
                  >
                    Link do Airbnb
                  </label>

                  <input
                    id="airbnb"
                    name="airbnb"
                    type="url"
                    defaultValue={catalog.airbnb}
                    className={inputClassName}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label
                    htmlFor="booking"
                    className={labelClassName}
                  >
                    Link do Booking
                  </label>

                  <input
                    id="booking"
                    name="booking"
                    type="url"
                    defaultValue={catalog.booking ?? ""}
                    className={inputClassName}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label
                    htmlFor="whatsapp"
                    className={labelClassName}
                  >
                    WhatsApp
                  </label>

                  <input
                    id="whatsapp"
                    name="whatsapp"
                    defaultValue={catalog.whatsapp}
                    className={inputClassName}
                    placeholder="Link ou número"
                  />
                </div>

                <div>
                  <label
                    htmlFor="rating"
                    className={labelClassName}
                  >
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
                    defaultValue={catalog.rating}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="reviews"
                    className={labelClassName}
                  >
                    Quantidade de avaliações
                  </label>

                  <input
                    id="reviews"
                    name="reviews"
                    type="number"
                    min="0"
                    step="1"
                    required
                    defaultValue={catalog.reviews}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="displayOrder"
                    className={labelClassName}
                  >
                    Ordem de exibição
                  </label>

                  <input
                    id="displayOrder"
                    name="displayOrder"
                    type="number"
                    min="0"
                    step="1"
                    required
                    defaultValue={catalog.display_order}
                    className={inputClassName}
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <input
                  name="featured"
                  type="checkbox"
                  defaultChecked={catalog.featured}
                  className="h-5 w-5 rounded border-slate-300"
                />

                <span>
                  <span className="block font-semibold text-slate-900">
                    Destacar imóvel
                  </span>

                  <span className="block text-sm text-slate-600">
                    Marca a casa como destaque no catálogo. A ativação pública continua sendo controlada no painel.
                  </span>
                </span>
              </label>
            </fieldset>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row">
              <button
                type="submit"
                className="rounded-xl bg-green-700 px-6 py-3 font-bold text-white transition hover:bg-green-800"
              >
                Salvar dados do imóvel
              </button>

              <Link
                href={`/imoveis/${catalog.id}`}
                target="_blank"
                className="rounded-xl border border-blue-950 px-6 py-3 text-center font-bold text-blue-950 transition hover:bg-blue-50"
              >
                Abrir página pública
              </Link>
            </div>
          </form>

          <div
            id="fotos-imovel"
            className="mb-6 mt-12 scroll-mt-28 border-t border-slate-200 pt-8"
          >
            <h2 className="text-2xl font-bold text-slate-900">
              Fotos do imóvel
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Adicione, remova, reorganize e escolha a foto principal.
            </p>
          </div>

          <form
            action={updatePropertyPhotos}
            className="mb-10"
          >
            <PropertyPhotoManager
              propertyId={catalog.id}
              initialPhotos={initialPhotos}
            />
          </form>

          <div
            id="precos-imovel"
            className="mb-6 scroll-mt-28 border-t border-slate-200 pt-8"
          >
            <h2 className="text-2xl font-bold text-slate-900">
              Preços e disponibilidade
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Ajuste os valores usados pelo cálculo automático de reservas.
            </p>
          </div>

          <form
            action={updatePropertyPricing}
            className="space-y-6"
          >
            <input
              type="hidden"
              name="propertyId"
              value={pricing.property_id}
            />

            <div>
              <label
                htmlFor="basePrice"
                className={labelClassName}
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
                defaultValue={pricing.base_price}
                className={inputClassName}
              />

              <p className="mt-2 text-sm text-slate-500">
                Valor principal usado pelo cálculo automático.
              </p>
            </div>

            <div>
              <label
                htmlFor="cleaningFee"
                className={labelClassName}
              >
                Taxa de limpeza
              </label>

              <input
                id="cleaningFee"
                name="cleaningFee"
                type="number"
                min="0"
                step="0.01"
                defaultValue={pricing.cleaning_fee ?? ""}
                className={inputClassName}
                placeholder="Exemplo: 300"
              />
            </div>

            <div>
              <label
                htmlFor="minimumNights"
                className={labelClassName}
              >
                Mínimo padrão de noites
              </label>

              <input
                id="minimumNights"
                name="minimumNights"
                type="number"
                min="1"
                step="1"
                defaultValue={pricing.minimum_nights ?? ""}
                className={inputClassName}
                placeholder="Exemplo: 2"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="minimumPrice"
                  className={labelClassName}
                >
                  Preço mínimo
                </label>

                <input
                  id="minimumPrice"
                  name="minimumPrice"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={pricing.minimum_price ?? ""}
                  className={inputClassName}
                  placeholder="Valor mínimo permitido"
                />
              </div>

              <div>
                <label
                  htmlFor="maximumPrice"
                  className={labelClassName}
                >
                  Preço máximo
                </label>

                <input
                  id="maximumPrice"
                  name="maximumPrice"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={pricing.maximum_price ?? ""}
                  className={inputClassName}
                  placeholder="Valor máximo permitido"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <input
                name="active"
                type="checkbox"
                defaultChecked={pricing.active}
                className="h-5 w-5 rounded border-slate-300"
              />

              <span>
                <span className="block font-semibold text-slate-900">
                  Configuração de preços ativa
                </span>

                <span className="block text-sm text-slate-600">
                  Permite que este imóvel utilize as configurações de preços do painel.
                </span>
              </span>
            </label>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row">
              <button
                type="submit"
                className="rounded-xl bg-blue-950 px-6 py-3 font-bold text-white transition hover:bg-blue-900"
              >
                Salvar preços
              </button>

              <Link
                href="/admin"
                className="rounded-xl border border-slate-300 px-6 py-3 text-center font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Voltar ao painel
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
