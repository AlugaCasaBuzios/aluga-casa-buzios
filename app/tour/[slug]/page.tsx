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
};

type PublicTourRecord = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  brand_name: string | null;
  contact_name: string | null;
  contact_whatsapp: string | null;
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
      contact_whatsapp
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
    },
  };
}

export default async function PublicTourPage({
  params,
}: PublicTourPageProps) {
  const {
    slug,
  } = await params;

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

  const brand =
    tour.brand_name ||
    "Aluga Casa Búzios";

  const whatsapp =
    (
      tour.contact_whatsapp ||
      "5524998288846"
    ).replace(/\D/g, "");

  const whatsappMessage =
    `Olá! Vi o passeio virtual 360° de ${tour.title} e gostaria de receber mais informações.`;

  const whatsappUrl =
    `https://wa.me/${whatsapp}?text=${encodeURIComponent(
      whatsappMessage
    )}`;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10 bg-blue-950 shadow-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-300">
              {brand}
            </p>

            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              {tour.title}
            </h1>

            <p className="mt-2 text-blue-100">
              Passeio virtual 360° · {scenes.length} ambiente(s)
            </p>
          </div>

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
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-300">
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

        <VirtualTourViewer
          title={`${tour.title} — Passeio virtual 360°`}
          startSceneId={startSceneId}
          scenes={scenes}
          height="75vh"
        />

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

        <div className="mt-8 flex flex-col items-center justify-between gap-5 rounded-3xl bg-blue-950 p-6 shadow-xl sm:flex-row">
          <div>
            <h2 className="text-xl font-black">
              Gostou do passeio?
            </h2>

            <p className="mt-1 text-blue-100">
              {tour.contact_name
                ? `Fale com ${tour.contact_name} para receber mais informações.`
                : "Entre em contato para receber mais informações."}
            </p>
          </div>

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
        </div>

        <footer className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 py-6 text-sm text-zinc-400 sm:flex-row">
          <p>
            Passeio virtual produzido por {brand}
          </p>

          <Link
            href="/"
            className="font-bold text-sky-300 transition hover:text-white"
          >
            Conhecer o site
          </Link>
        </footer>
      </section>
    </main>
  );
}
