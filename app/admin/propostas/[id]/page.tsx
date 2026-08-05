import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

import ProposalStatusForm from "./ProposalStatusForm";

export const dynamic = "force-dynamic";

const STORAGE_BUCKET =
  "property-lead-photos";

type ProposalDetailPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    salvo?: string;
  }>;
};

type ProposalRecord = {
  id: string;
  created_at: string;

  owner_name: string;
  owner_whatsapp: string;
  owner_email: string | null;
  owner_role: string | null;
  preferred_contact: string | null;

  property_name: string | null;
  property_type: string | null;

  address: string | null;
  address_number: string | null;
  address_complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  google_maps_url: string | null;

  maximum_guests: number | null;
  bedrooms: number | null;
  suites: number | null;
  beds: number | null;
  bathrooms: number | null;
  garage_spaces: number | null;

  amenities: unknown;
  management_needs: unknown;
  property_description: string | null;

  airbnb_url: string | null;
  booking_url: string | null;
  other_listing_url: string | null;

  privacy_consent: boolean;
  photo_count: number | null;

  source_page: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

type ProposalPhotoRecord = {
  id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  sort_order: number;
};

type ProposalPhotoWithUrl =
  ProposalPhotoRecord & {
    signed_url: string | null;
  };

function formatDateTime(
  value: string
): string {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Data não informada";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "long",
      timeStyle: "short",
      timeZone:
        "America/Sao_Paulo",
    }
  ).format(date);
}

function formatFileSize(
  value: number
): string {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return "Tamanho não informado";
  }

  const megabytes =
    value / (1024 * 1024);

  if (megabytes >= 1) {
    return `${megabytes.toFixed(
      1
    )} MB`;
  }

  const kilobytes =
    value / 1024;

  return `${kilobytes.toFixed(
    0
  )} KB`;
}

function formatNumber(
  value: number | null
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "Não informado";
  }

  return String(value);
}

function formatText(
  value: string | null
): string {
  const normalized =
    value?.trim();

  return (
    normalized ||
    "Não informado"
  );
}

function formatOwnerRole(
  value: string | null
): string {
  const roles: Record<
    string,
    string
  > = {
    owner: "Proprietário(a)",
    administrator:
      "Administrador(a)",
    broker: "Corretor(a)",
    family:
      "Familiar do proprietário",
    other: "Outro",
  };

  if (!value) {
    return "Não informado";
  }

  return roles[value] || value;
}

function formatPreferredContact(
  value: string | null
): string {
  const contacts: Record<
    string,
    string
  > = {
    whatsapp: "WhatsApp",
    email: "E-mail",
    phone: "Ligação",
  };

  if (!value) {
    return "Não informado";
  }

  return (
    contacts[value] ||
    value
  );
}

function formatPropertyType(
  value: string | null
): string {
  const propertyTypes: Record<
    string,
    string
  > = {
    house: "Casa",
    apartment: "Apartamento",
    flat: "Flat",
    loft: "Loft",
    guesthouse:
      "Casa de hóspedes",
    other: "Outro",
  };

  if (!value) {
    return "Não informado";
  }

  return (
    propertyTypes[value] ||
    value
  );
}

function toTextList(
  value: unknown
): string[] {
  if (Array.isArray(value)) {
    return value
      .filter(
        (
          item
        ): item is string =>
          typeof item === "string"
      )
      .map((item) =>
        item.trim()
      )
      .filter(Boolean);
  }

  if (
    typeof value === "string"
  ) {
    const normalized =
      value.trim();

    if (!normalized) {
      return [];
    }

    try {
      const parsed =
        JSON.parse(normalized);

      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (
              item
            ): item is string =>
              typeof item ===
              "string"
          )
          .map((item) =>
            item.trim()
          )
          .filter(Boolean);
      }
    } catch {
      return normalized
        .split(",")
        .map((item) =>
          item.trim()
        )
        .filter(Boolean);
    }
  }

  return [];
}

function getSafeExternalUrl(
  value: string | null
): string | null {
  if (!value) {
    return null;
  }

  try {
    const url =
      new URL(value);

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function getWhatsAppUrl(
  value: string
): string | null {
  const digits =
    value.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  const normalizedNumber =
    digits.startsWith("55")
      ? digits
      : `55${digits}`;

  const message =
    "Olá! Recebemos sua proposta de imóvel pelo site da Aluga Casa Búzios e gostaríamos de conversar.";

  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(
    message
  )}`;
}

function getFullAddress(
  proposal: ProposalRecord
): string {
  const street = [
    proposal.address,
    proposal.address_number,
  ]
    .filter(Boolean)
    .join(", ");

  return [
    street,
    proposal.address_complement,
    proposal.neighborhood,
    proposal.city,
    proposal.state,
  ]
    .filter(Boolean)
    .join(" — ");
}

export default async function ProposalDetailPage({
  params,
  searchParams,
}: ProposalDetailPageProps) {
  const [
    { id },
    { salvo },
  ] = await Promise.all([
    params,
    searchParams,
  ]);

  const authenticationClient =
    await createSupabaseServerClient();

  const {
    data: { user },
  } =
    await authenticationClient.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const supabase =
    createSupabaseAdminClient();

  const {
    data: proposalData,
    error: proposalError,
  } = await supabase
    .from(
      "property_management_leads"
    )
    .select(`
      id,
      created_at,
      owner_name,
      owner_whatsapp,
      owner_email,
      owner_role,
      preferred_contact,
      property_name,
      property_type,
      address,
      address_number,
      address_complement,
      neighborhood,
      city,
      state,
      google_maps_url,
      maximum_guests,
      bedrooms,
      suites,
      beds,
      bathrooms,
      garage_spaces,
      amenities,
      management_needs,
      property_description,
      airbnb_url,
      booking_url,
      other_listing_url,
      privacy_consent,
      photo_count,
      source_page,
      utm_source,
      utm_medium,
      utm_campaign
    `)
    .eq("id", id)
    .maybeSingle();

  if (proposalError) {
    console.error(
      "Erro ao carregar proposta:",
      proposalError
    );

    return (
      <main className="min-h-screen bg-slate-100 px-4 py-12">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-red-700">
            Não foi possível carregar a proposta
          </h1>

          <p className="mt-3 text-slate-600">
            Ocorreu um erro ao consultar os dados no
            Supabase.
          </p>

          <Link
            href="/admin/propostas"
            style={{
              color: "#ffffff",
            }}
            className="mt-7 inline-flex rounded-xl bg-blue-950 px-6 py-3 font-bold"
          >
            Voltar para propostas
          </Link>
        </div>
      </main>
    );
  }

  if (!proposalData) {
    notFound();
  }

  const proposal =
    proposalData as ProposalRecord;

  const {
    data: photoData,
    error: photosError,
  } = await supabase
    .from(
      "property_management_lead_photos"
    )
    .select(`
      id,
      storage_path,
      original_name,
      mime_type,
      size_bytes,
      sort_order
    `)
    .eq("lead_id", id)
    .order("sort_order", {
      ascending: true,
    });

  if (photosError) {
    console.error(
      "Erro ao carregar fotos da proposta:",
      photosError
    );
  }

  const photos =
    (photoData ??
      []) as ProposalPhotoRecord[];

  const photosWithUrls: ProposalPhotoWithUrl[] =
    await Promise.all(
      photos.map(
        async (
          photo
        ): Promise<ProposalPhotoWithUrl> => {
          const {
            data,
            error,
          } =
            await supabase.storage
              .from(
                STORAGE_BUCKET
              )
              .createSignedUrl(
                photo.storage_path,
                60 * 60
              );

          if (error) {
            console.error(
              "Erro ao gerar link da foto:",
              error
            );
          }

          return {
            ...photo,
            signed_url:
              data?.signedUrl ??
              null,
          };
        }
      )
    );

  const amenities =
    toTextList(
      proposal.amenities
    );

  const managementNeeds =
    toTextList(
      proposal.management_needs
    );

  const whatsappUrl =
    getWhatsAppUrl(
      proposal.owner_whatsapp
    );

  const mapsUrl =
    getSafeExternalUrl(
      proposal.google_maps_url
    );

  const airbnbUrl =
    getSafeExternalUrl(
      proposal.airbnb_url
    );

  const bookingUrl =
    getSafeExternalUrl(
      proposal.booking_url
    );

  const otherListingUrl =
    getSafeExternalUrl(
      proposal.other_listing_url
    );

  const fullAddress =
    getFullAddress(proposal);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl bg-blue-950 p-7 text-white shadow-lg sm:p-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-sky-300">
                Proposta de imóvel
              </p>

              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                {proposal.property_name ||
                  "Imóvel sem nome"}
              </h1>

              <p className="mt-3 text-blue-100">
                Enviada em{" "}
                {formatDateTime(
                  proposal.created_at
                )}
              </p>

              <p className="mt-2 break-all text-sm text-blue-200">
                Código: {proposal.id}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin/propostas"
                style={{
                  color: "#172554",
                }}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 py-3 font-bold shadow-sm transition hover:bg-blue-100"
              >
                ← Voltar às propostas
              </Link>

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#ffffff",
                  }}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-green-600 px-6 py-3 font-bold shadow-sm transition hover:bg-green-700"
                >
                  Falar pelo WhatsApp
                </a>
              )}
            </div>
          </div>
        </header>

        {salvo === "1" && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-800"
          >
            Andamento da proposta salvo com sucesso.
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_360px]">
          <div className="space-y-8">
            <section className="rounded-3xl bg-white p-6 shadow-lg sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900">
                Dados do proprietário
              </h2>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <InfoItem
                  label="Nome"
                  value={formatText(
                    proposal.owner_name
                  )}
                />

                <InfoItem
                  label="WhatsApp"
                  value={formatText(
                    proposal.owner_whatsapp
                  )}
                />

                <InfoItem
                  label="E-mail"
                  value={formatText(
                    proposal.owner_email
                  )}
                />

                <InfoItem
                  label="Relação com o imóvel"
                  value={formatOwnerRole(
                    proposal.owner_role
                  )}
                />

                <InfoItem
                  label="Contato preferencial"
                  value={formatPreferredContact(
                    proposal.preferred_contact
                  )}
                />

                <InfoItem
                  label="Autorizou o uso dos dados"
                  value={
                    proposal.privacy_consent
                      ? "Sim"
                      : "Não"
                  }
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#ffffff",
                    }}
                    className="inline-flex items-center justify-center rounded-xl bg-green-600 px-5 py-3 font-bold transition hover:bg-green-700"
                  >
                    Abrir WhatsApp
                  </a>
                )}

                {proposal.owner_email && (
                  <a
                    href={`mailto:${proposal.owner_email}`}
                    style={{
                      color: "#172554",
                    }}
                    className="inline-flex items-center justify-center rounded-xl border border-blue-950 px-5 py-3 font-bold transition hover:bg-blue-50"
                  >
                    Enviar e-mail
                  </a>
                )}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-lg sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900">
                Localização do imóvel
              </h2>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <InfoItem
                  label="Endereço"
                  value={
                    fullAddress ||
                    "Não informado"
                  }
                  fullWidth
                />

                <InfoItem
                  label="Bairro"
                  value={formatText(
                    proposal.neighborhood
                  )}
                />

                <InfoItem
                  label="Cidade"
                  value={formatText(
                    proposal.city
                  )}
                />

                <InfoItem
                  label="Estado"
                  value={formatText(
                    proposal.state
                  )}
                />

                <InfoItem
                  label="Tipo do imóvel"
                  value={formatPropertyType(
                    proposal.property_type
                  )}
                />
              </div>

              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#ffffff",
                  }}
                  className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-950 px-5 py-3 font-bold transition hover:bg-blue-900"
                >
                  Abrir localização no Google Maps
                </a>
              )}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-lg sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900">
                Estrutura e capacidade
              </h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumberCard
                  label="Hóspedes"
                  value={formatNumber(
                    proposal.maximum_guests
                  )}
                />

                <NumberCard
                  label="Quartos"
                  value={formatNumber(
                    proposal.bedrooms
                  )}
                />

                <NumberCard
                  label="Suítes"
                  value={formatNumber(
                    proposal.suites
                  )}
                />

                <NumberCard
                  label="Camas"
                  value={formatNumber(
                    proposal.beds
                  )}
                />

                <NumberCard
                  label="Banheiros"
                  value={formatNumber(
                    proposal.bathrooms
                  )}
                />

                <NumberCard
                  label="Vagas"
                  value={formatNumber(
                    proposal.garage_spaces
                  )}
                />
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-lg sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900">
                Comodidades
              </h2>

              {amenities.length > 0 ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  {amenities.map(
                    (amenity) => (
                      <span
                        key={amenity}
                        className="rounded-full bg-sky-100 px-4 py-2 font-semibold text-sky-800"
                      >
                        {amenity}
                      </span>
                    )
                  )}
                </div>
              ) : (
                <p className="mt-4 text-slate-600">
                  Nenhuma comodidade foi informada.
                </p>
              )}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-lg sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900">
                Serviços procurados
              </h2>

              {managementNeeds.length >
              0 ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  {managementNeeds.map(
                    (need) => (
                      <span
                        key={need}
                        className="rounded-full bg-blue-100 px-4 py-2 font-semibold text-blue-900"
                      >
                        {need}
                      </span>
                    )
                  )}
                </div>
              ) : (
                <p className="mt-4 text-slate-600">
                  Nenhum serviço específico foi informado.
                </p>
              )}

              <div className="mt-8 border-t border-slate-200 pt-6">
                <h3 className="font-bold text-slate-900">
                  Descrição enviada
                </h3>

                <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
                  {formatText(
                    proposal.property_description
                  )}
                </p>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-lg sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Fotos do imóvel
                  </h2>

                  <p className="mt-2 text-slate-600">
                    {photosWithUrls.length}{" "}
                    {photosWithUrls.length ===
                    1
                      ? "foto registrada"
                      : "fotos registradas"}
                  </p>
                </div>

                <span className="text-sm text-slate-500">
                  Os links ficam disponíveis por uma hora.
                </span>
              </div>

              {photosWithUrls.length ===
              0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                  <p className="font-semibold text-slate-700">
                    Nenhuma foto foi registrada nesta proposta.
                  </p>
                </div>
              ) : (
                <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {photosWithUrls.map(
                    (
                      photo,
                      index
                    ) => (
                      <article
                        key={photo.id}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                      >
                        {photo.signed_url ? (
                          <a
                            href={
                              photo.signed_url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={
                                photo.signed_url
                              }
                              alt={`Foto ${
                                index + 1
                              } do imóvel`}
                              loading="lazy"
                              className="h-56 w-full object-cover"
                            />
                          </a>
                        ) : (
                          <div className="flex h-56 items-center justify-center bg-slate-200 px-5 text-center text-sm font-semibold text-slate-600">
                            Não foi possível carregar esta foto.
                          </div>
                        )}

                        <div className="p-4">
                          <p className="truncate font-semibold text-slate-900">
                            {
                              photo.original_name
                            }
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {formatFileSize(
                              photo.size_bytes
                            )}
                          </p>

                          {photo.signed_url && (
                            <a
                              href={
                                photo.signed_url
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-flex text-sm font-bold text-sky-700 hover:text-sky-900"
                            >
                              Abrir foto original →
                            </a>
                          )}
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-8">
            <ProposalStatusForm
              proposalId={proposal.id}
            />

            <section className="rounded-3xl bg-white p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-900">
                Resumo
              </h2>

              <div className="mt-5 space-y-4">
                <InfoItem
                  label="Tipo"
                  value={formatPropertyType(
                    proposal.property_type
                  )}
                />

                <InfoItem
                  label="Bairro"
                  value={formatText(
                    proposal.neighborhood
                  )}
                />

                <InfoItem
                  label="Hóspedes"
                  value={formatNumber(
                    proposal.maximum_guests
                  )}
                />

                <InfoItem
                  label="Fotos confirmadas"
                  value={formatNumber(
                    proposal.photo_count
                  )}
                />
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-900">
                Anúncios existentes
              </h2>

              <div className="mt-5 flex flex-col gap-3">
                {airbnbUrl && (
                  <ExternalButton
                    href={airbnbUrl}
                    label="Abrir no Airbnb"
                  />
                )}

                {bookingUrl && (
                  <ExternalButton
                    href={bookingUrl}
                    label="Abrir no Booking"
                  />
                )}

                {otherListingUrl && (
                  <ExternalButton
                    href={otherListingUrl}
                    label="Abrir outro anúncio"
                  />
                )}

                {!airbnbUrl &&
                  !bookingUrl &&
                  !otherListingUrl && (
                    <p className="text-sm leading-6 text-slate-600">
                      Nenhum anúncio externo foi informado.
                    </p>
                  )}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-900">
                Origem da proposta
              </h2>

              <div className="mt-5 space-y-4">
                <InfoItem
                  label="Página"
                  value={formatText(
                    proposal.source_page
                  )}
                />

                <InfoItem
                  label="UTM source"
                  value={formatText(
                    proposal.utm_source
                  )}
                />

                <InfoItem
                  label="UTM medium"
                  value={formatText(
                    proposal.utm_medium
                  )}
                />

                <InfoItem
                  label="UTM campaign"
                  value={formatText(
                    proposal.utm_campaign
                  )}
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

type InfoItemProps = {
  label: string;
  value: string;
  fullWidth?: boolean;
};

function InfoItem({
  label,
  value,
  fullWidth = false,
}: InfoItemProps) {
  return (
    <div
      className={
        fullWidth
          ? "sm:col-span-2"
          : undefined
      }
    >
      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

type NumberCardProps = {
  label: string;
  value: string;
};

function NumberCard({
  label,
  value,
}: NumberCardProps) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-blue-950">
        {value}
      </p>
    </div>
  );
}

type ExternalButtonProps = {
  href: string;
  label: string;
};

function ExternalButton({
  href,
  label,
}: ExternalButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: "#172554",
      }}
      className="inline-flex min-h-12 items-center justify-center rounded-xl border border-blue-950 px-5 py-3 text-center font-bold transition hover:bg-blue-50"
    >
      {label}
    </a>
  );
}