import type {
  Metadata,
} from "next";

import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import VirtualTourViewer, {
  type VirtualTourScene,
} from "@/components/virtual-tour/VirtualTourViewer";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

const STORAGE_BUCKET =
  "virtual-tour-images";

type PublicTourPageProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    embed?: string;
  }>;
};

type PublicTourRecord = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  brand_name: string | null;
  contact_name: string | null;
  contact_whatsapp: string | null;
  contact_phone: string | null;
  cover_image_path: string | null;
  logo_path: string | null;
  primary_color: string | null;
  accent_color: string | null;
  white_label: boolean | null;
};

type PublicSceneRecord = {
  id: string;
  name: string;
  panorama_path: string;
  thumbnail_path: string | null;
  caption: string | null;
  sort_order: number;
  is_start: boolean;
};

type PublicSceneLinkRecord = {
  from_scene_id: string;
  to_scene_id: string;
  yaw_degrees: number | string;
  pitch_degrees: number | string;
};

function getSafeSlug(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .slice(0, 100);
}

function getSafeColor(
  value: string | null,
  fallback: string
): string {
  return value &&
    /^#[0-9A-F]{6}$/i.test(
      value
    )
    ? value.toUpperCase()
    : fallback;
}

function getContrastColor(
  background: string
): "#0F172A" | "#FFFFFF" {
  const red =
    Number.parseInt(
      background.slice(1, 3),
      16
    );

  const green =
    Number.parseInt(
      background.slice(3, 5),
      16
    );

  const blue =
    Number.parseInt(
      background.slice(5, 7),
      16
    );

  const luminance =
    (red * 299 +
      green * 587 +
      blue * 114) /
    1000;

  return luminance > 155
    ? "#0F172A"
    : "#FFFFFF";
}

async function getPublishedTour(
  slug: string
): Promise<PublicTourRecord | null> {
  const safeSlug =
    getSafeSlug(slug);

  if (!safeSlug) {
    return null;
  }

  const supabase =
    createSupabaseAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from("virtual_tours")
    .select(`
      id,
      title,
      slug,
      description,
      brand_name,
      contact_name,
      contact_whatsapp,
      contact_phone,
      cover_image_path,
      logo_path,
      primary_color,
      accent_color,
      white_label
    `)
    .eq("slug", safeSlug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error(
      "Erro ao localizar passeio público:",
      error
    );

    return null;
  }

  return data as
    PublicTourRecord | null;
}

export async function generateMetadata({
  params,
}: PublicTourPageProps): Promise<Metadata> {
  const {
    slug,
  } = await params;

  const tour =
    await getPublishedTour(
      slug
    );

  if (!tour) {
    return {
      title:
        "Passeio virtual não encontrado",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const brand =
    tour.brand_name ||
    "Aluga Casa Búzios";

  const description =
    tour.description ||
    "Conheça todos os ambientes por meio de um passeio virtual em 360 graus.";

  const coverUrl =
    tour.cover_image_path
      ? createSupabaseAdminClient()
          .storage.from(
            STORAGE_BUCKET
          )
          .getPublicUrl(
            tour.cover_image_path
          ).data.publicUrl
      : null;

  return {
    title: `${tour.title} | ${brand}`,
    description,
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title: tour.title,
      description,
      type: "website",
      images: coverUrl
        ? [
            coverUrl,
          ]
        : undefined,
    },
  };
}

export default async function PublicTourPage({
  params,
  searchParams,
}: PublicTourPageProps) {
  const {
    slug,
  } = await params;

  const {
    embed,
  } = await searchParams;

  const isEmbedded =
    embed === "1";

  const tour =
    await getPublishedTour(
      slug
    );

  if (!tour) {
    notFound();
  }

  const supabase =
    createSupabaseAdminClient();

  const {
    data: sceneData,
    error: scenesError,
  } = await supabase
    .from("virtual_tour_scenes")
    .select(`
      id,
      name,
      panorama_path,
      thumbnail_path,
      caption,
      sort_order,
      is_start
    `)
    .eq("tour_id", tour.id)
    .order("sort_order", {
      ascending: true,
    });

  if (scenesError) {
    console.error(
      "Erro ao carregar ambientes do passeio:",
      scenesError
    );

    notFound();
  }

  const sceneRecords =
    (sceneData ?? []) as
      PublicSceneRecord[];

  if (sceneRecords.length === 0) {
    notFound();
  }

  const sceneIds =
    sceneRecords.map(
      (scene) => scene.id
    );

  const {
    data: sceneLinkData,
    error: sceneLinksError,
  } = await supabase
    .from("virtual_tour_links")
    .select(`
      from_scene_id,
      to_scene_id,
      yaw_degrees,
      pitch_degrees
    `)
    .in(
      "from_scene_id",
      sceneIds
    );

  if (sceneLinksError) {
    console.error(
      "Erro ao carregar conexões do passeio:",
      sceneLinksError
    );
  }

  const sceneLinks =
    (sceneLinkData ?? []) as
      PublicSceneLinkRecord[];

  const validSceneIds =
    new Set(sceneIds);

  const getPublicUrl = (
    path: string
  ) =>
    supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path)
      .data.publicUrl;

  const scenes:
    VirtualTourScene[] =
      sceneRecords.map(
        (scene) => ({
          id: scene.id,
          name: scene.name,
          panorama:
            getPublicUrl(
              scene.panorama_path
            ),
          thumbnail:
            getPublicUrl(
              scene.thumbnail_path ||
                scene.panorama_path
            ),
          caption:
            scene.caption ||
            scene.name,
          links:
            sceneLinks
              .filter(
                (link) =>
                  link.from_scene_id ===
                    scene.id &&
                  validSceneIds.has(
                    link.to_scene_id
                  )
              )
              .map(
                (link) => ({
                  nodeId:
                    link.to_scene_id,
                  yaw:
                    `${Number(
                      link.yaw_degrees
                    )}deg`,
                  pitch:
                    `${Number(
                      link.pitch_degrees
                    )}deg`,
                })
              ),
        })
      );

  const startSceneId =
    sceneRecords.find(
      (scene) =>
        scene.is_start
    )?.id ?? scenes[0].id;

  if (isEmbedded) {
    return (
      <main className="h-dvh min-h-[320px] overflow-hidden bg-zinc-950">
        <VirtualTourViewer
          title={`${tour.title} — Passeio virtual 360°`}
          startSceneId={startSceneId}
          scenes={scenes}
          height="100dvh"
          className="!rounded-none !shadow-none"
        />
      </main>
    );
  }

  const brand =
    tour.brand_name ||
    "Aluga Casa Búzios";

  const primaryColor =
    getSafeColor(
      tour.primary_color,
      "#172554"
    );

  const accentColor =
    getSafeColor(
      tour.accent_color,
      "#38BDF8"
    );

  const primaryTextColor =
    getContrastColor(
      primaryColor
    );

  const accentTextColor =
    getContrastColor(
      accentColor
    );

  const coverUrl =
    tour.cover_image_path
      ? getPublicUrl(
          tour.cover_image_path
        )
      : null;

  const logoUrl =
    tour.logo_path
      ? getPublicUrl(
          tour.logo_path
        )
      : null;

  const whatsapp =
    (
      tour.contact_whatsapp ||
      (tour.white_label
        ? ""
        : "5524998288846")
    ).replace(/\D/g, "");

  const phone =
    (
      tour.contact_phone ||
      ""
    ).replace(/\D/g, "");

  const whatsappMessage =
    `Olá! Vi o passeio virtual 360° de ${tour.title} e gostaria de receber mais informações.`;

  const whatsappUrl =
    whatsapp
      ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
          whatsappMessage
        )}`
      : null;

  const phoneUrl =
    phone
      ? `tel:+${phone}`
      : null;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header
        style={{
          backgroundColor:
            primaryColor,
          borderBottomColor:
            accentColor,
          color:
            primaryTextColor,
        }}
        className="border-b-4 shadow-xl"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {logoUrl && (
              <div className="flex min-h-20 min-w-28 items-center justify-center rounded-2xl bg-white p-3 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt={`Logotipo ${brand}`}
                  className="max-h-16 max-w-44 object-contain"
                />
              </div>
            )}

            <div>
              <p
                style={{
                  color:
                    accentColor,
                }}
                className="text-sm font-black uppercase tracking-[0.2em]"
              >
                {brand}
              </p>

              <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                {tour.title}
              </h1>

              <p
                className="mt-2 font-semibold opacity-80"
              >
                Passeio virtual 360° · {scenes.length} ambiente(s)
              </p>
            </div>
          </div>

          {(whatsappUrl ||
            phoneUrl) && (
            <div className="flex flex-col gap-3 sm:flex-row">
              {phoneUrl && (
                <a
                  href={phoneUrl}
                  style={{
                    backgroundColor:
                      accentColor,
                    color:
                      accentTextColor,
                  }}
                  className="inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 text-center font-black shadow-lg transition hover:brightness-110"
                >
                  Ligar
                </a>
              )}

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#ffffff",
                  }}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-green-600 px-6 py-3 text-center font-black text-white shadow-lg transition hover:bg-green-700"
                >
                  Solicitar informações
                </a>
              )}
            </div>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        {coverUrl && (
          <div className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt={`Capa do passeio virtual ${tour.title}`}
              className="aspect-[2/1] max-h-[560px] w-full object-cover"
            />

            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/90 via-black/20 to-transparent p-5 sm:p-8">
              <div className="max-w-3xl">
                <p
                  style={{
                    color:
                      accentColor,
                  }}
                  className="text-sm font-black uppercase tracking-[0.18em]"
                >
                  Visita virtual
                </p>

                <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">
                  {tour.title}
                </h2>

                <a
                  href="#passeio-360"
                  style={{
                    backgroundColor:
                      accentColor,
                    color:
                      accentTextColor,
                  }}
                  className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 font-black shadow-lg transition hover:brightness-110"
                >
                  Iniciar passeio 360°
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p
                style={{
                  color:
                    accentColor,
                }}
                className="text-sm font-bold uppercase tracking-[0.18em]"
              >
                Visita imersiva
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Explore cada ambiente
              </h2>

              <p className="mt-2 max-w-3xl leading-7 text-zinc-300">
                {tour.description ||
                  "Arraste a imagem para qualquer direção e utilize a galeria para caminhar pelos ambientes."}
              </p>
            </div>

            <span className="inline-flex w-fit rounded-full bg-green-500/15 px-4 py-2 text-sm font-black text-green-300">
              {scenes.length} ambiente(s) disponível(is)
            </span>
          </div>
        </div>

        <div
          id="passeio-360"
          className="scroll-mt-5"
        >
          <VirtualTourViewer
            title={`${tour.title} — Passeio virtual 360°`}
            startSceneId={startSceneId}
            scenes={scenes}
            height="75vh"
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-black">
              Arraste para explorar
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Clique ou toque na imagem e movimente para observar todos os detalhes.
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-black">
              Escolha o ambiente
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Abra a galeria do passeio e selecione qualquer ambiente cadastrado.
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-black">
              Experiência imersiva
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Use tela cheia, rotação automática ou giroscópio no celular.
            </p>
          </article>
        </div>

        <div
          style={{
            backgroundColor:
              primaryColor,
            color:
              primaryTextColor,
          }}
          className="mt-8 flex flex-col items-center justify-between gap-5 rounded-3xl p-6 shadow-xl sm:flex-row"
        >
          <div>
            <h2 className="text-xl font-black">
              Gostou do passeio?
            </h2>

            <p className="mt-1 font-semibold opacity-80">
              {tour.contact_name
                ? `Fale com ${tour.contact_name} para receber mais informações.`
                : "Entre em contato para receber mais informações."}
            </p>
          </div>

          {(whatsappUrl ||
            phoneUrl) && (
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              {phoneUrl && (
                <a
                  href={phoneUrl}
                  style={{
                    backgroundColor:
                      accentColor,
                    color:
                      accentTextColor,
                  }}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 py-3 text-center font-black shadow-lg transition hover:brightness-110 sm:w-auto"
                >
                  Ligar agora
                </a>
              )}

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#ffffff",
                  }}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-green-600 px-6 py-3 text-center font-black text-white shadow-lg transition hover:bg-green-700 sm:w-auto"
                >
                  Falar pelo WhatsApp
                </a>
              )}
            </div>
          )}
        </div>

        {!tour.white_label && (
          <footer className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 py-6 text-sm text-zinc-400 sm:flex-row">
            <p>
              Tecnologia de passeio virtual por Aluga Casa Búzios
            </p>

            <Link
              href="/"
              style={{
                color:
                  accentColor,
              }}
              className="font-bold transition hover:brightness-125"
            >
              Conhecer a plataforma
            </Link>
          </footer>
        )}
      </section>
    </main>
  );
}
