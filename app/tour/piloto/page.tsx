import type {
  Metadata,
} from "next";

import Link from "next/link";

import VirtualTourViewer, {
  type VirtualTourScene,
} from "@/components/virtual-tour/VirtualTourViewer";

export const metadata: Metadata = {
  title:
    "Passeio virtual 360° | Aluga Casa Búzios",

  description:
    "Conheça o imóvel por meio de um passeio virtual em 360 graus.",

  robots: {
    index: false,
    follow: false,
  },
};

const scenes: VirtualTourScene[] = [
  {
    id: "sala",

    name: "Sala",

    panorama:
      "/images/tours/piloto/sala.jpg",

    thumbnail:
      "/images/tours/piloto/sala.jpg",

    caption:
      "Sala — Passeio virtual 360°",

    description:
      "Conheça a sala e siga para a área gourmet.",

    links: [
      {
        nodeId: "area-gourmet",
        yaw: "0deg",
        pitch: "-8deg",
      },
    ],
  },
  {
    id: "area-gourmet",

    name: "Área Gourmet",

    panorama:
      "/images/tours/piloto/area-gourmet.jpg",

    thumbnail:
      "/images/tours/piloto/area-gourmet.jpg",

    caption:
      "Área Gourmet — Passeio virtual 360°",

    description:
      "Explore a área gourmet e retorne para a sala quando desejar.",

    links: [
      {
        nodeId: "sala",
        yaw: "180deg",
        pitch: "-8deg",
      },
    ],
  },
];

export default function PilotTourPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-blue-950 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-300">
              Aluga Casa Búzios
            </p>

            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Passeio virtual 360°
            </h1>

            <p className="mt-2 max-w-2xl leading-7 text-blue-100">
              Explore os ambientes do imóvel
              e conheça cada detalhe antes da
              sua reserva.
            </p>
          </div>

          <Link
            href="/casas"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 py-3 font-bold text-blue-950 shadow-md transition hover:bg-sky-100"
          >
            Ver todas as casas
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-700">
                Experiência piloto
              </p>

              <h2 className="mt-2 text-2xl font-black text-blue-950">
                Conheça o imóvel
              </h2>

              <p className="mt-2 max-w-3xl leading-7 text-slate-600">
                Arraste a imagem para observar
                o ambiente e use as setas do
                passeio para caminhar entre a
                Sala e a Área Gourmet.
              </p>
            </div>

            <span className="inline-flex w-fit rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-800">
              2 ambientes disponíveis
            </span>
          </div>
        </div>

        <VirtualTourViewer
          title="Passeio virtual 360°"
          startSceneId="sala"
          scenes={scenes}
          height="72vh"
        />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="font-bold text-blue-950">
              Arraste para explorar
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Clique ou toque na imagem e
              movimente para qualquer direção.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="font-bold text-blue-950">
              Caminhe pelos ambientes
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Clique nas setas dentro da imagem
              ou selecione um ambiente na
              galeria.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="font-bold text-blue-950">
              Use a tela cheia
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Abra o passeio em tela cheia para
              uma experiência mais imersiva.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-5 rounded-3xl bg-blue-950 p-6 text-white shadow-lg sm:flex-row">
          <div>
            <h2 className="text-xl font-black">
              Gostou deste imóvel?
            </h2>

            <p className="mt-1 text-blue-100">
              Consulte disponibilidade e valores
              diretamente com nossa equipe.
            </p>
          </div>

          <a
            href="https://wa.me/5524998288846?text=Olá! Vi o passeio virtual 360° e gostaria de consultar a disponibilidade do imóvel."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-green-600 px-6 py-3 text-center font-bold text-white shadow-md transition hover:bg-green-700 sm:w-auto"
          >
            Consultar pelo WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}
