import type { Metadata } from "next";
import Link from "next/link";

import { properties } from "@/app/data/properties";

import CasasContent from "@/components/casas/CasasContent";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

const siteUrl =
  "https://alugacasabuzios.com.br";

const pageUrl = `${siteUrl}/casas`;

export const metadata: Metadata = {
  title: "Casas para temporada em Búzios",

  description:
    "Encontre casas para temporada em Búzios por bairro, quantidade de hóspedes e comodidades. Imóveis verificados e atendimento direto pelo WhatsApp.",

  keywords: [
    "casas para temporada em Búzios",
    "casas de temporada em Búzios",
    "aluguel de casas em Búzios",
    "casa com piscina em Búzios",
    "hospedagem em Búzios",
  ],

  alternates: {
    canonical: pageUrl,
  },

  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: pageUrl,
    siteName: "Aluga Casa Búzios",
    title: "Casas para temporada em Búzios",
    description:
      "Casas selecionadas em diferentes regiões de Búzios, com fotos reais e atendimento direto.",
  },

  twitter: {
    card: "summary_large_image",
    title: "Casas para temporada em Búzios",
    description:
      "Encontre a casa ideal para sua viagem a Armação dos Búzios.",
  },
};

const collectionPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",

  name: "Casas para temporada em Búzios",

  description:
    "Seleção de casas para temporada em Armação dos Búzios.",

  url: pageUrl,

  mainEntity: {
    "@type": "ItemList",

    numberOfItems: properties.length,

    itemListElement: properties.map(
      (property, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: property.title,
        url: `${siteUrl}/imoveis/${property.id}`,
      })
    ),
  },
};

const regions = [
  {
    name: "Geribá e São José",
    description:
      "Opções próximas à região de Geribá, indicadas para famílias e grupos.",
    href: "/imoveis/casa-em-buzios",
  },
  {
    name: "Tucuns",
    description:
      "Região tranquila, com praia extensa e boas opções para grupos maiores.",
    href: "/imoveis/casa-doce-mar",
  },
  {
    name: "Centro de Búzios",
    description:
      "Hospedagem próxima ao comércio, restaurantes e à Rua das Pedras.",
    href: "/imoveis/centro-top",
  },
  {
    name: "Praia da Tartaruga",
    description:
      "Localização prática para aproveitar uma das praias mais conhecidas de Búzios.",
    href: "/imoveis/flat-tartaruga",
  },
  {
    name: "Condomínio Aretê",
    description:
      "Casas amplas em condomínio, com conforto para famílias e grupos.",
    href: "/imoveis/arete-top",
  },
];

export default function CasasPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-zinc-50">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              collectionPageJsonLd
            ).replace(/</g, "\\u003c"),
          }}
        />

        <CasasContent />

        <section className="border-t border-zinc-200 bg-white px-6 py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
                Planeje sua hospedagem
              </p>

              <h2 className="mt-3 text-3xl font-bold text-blue-950 sm:text-4xl">
                Como escolher sua casa para
                temporada em Búzios
              </h2>

              <p className="mt-5 text-lg leading-8 text-zinc-600">
                Cada viagem possui necessidades
                diferentes. Antes de reservar,
                considere a região, a quantidade de
                hóspedes, as comodidades e a
                proximidade dos lugares que deseja
                conhecer.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <article className="rounded-3xl border border-zinc-200 bg-zinc-50 p-7">
                <div
                  aria-hidden="true"
                  className="text-3xl"
                >
                  📍
                </div>

                <h3 className="mt-4 text-xl font-bold text-blue-950">
                  Escolha a região
                </h3>

                <p className="mt-3 leading-7 text-zinc-600">
                  Avalie quais praias, restaurantes
                  e atrações pretende visitar
                  durante a hospedagem.
                </p>
              </article>

              <article className="rounded-3xl border border-zinc-200 bg-zinc-50 p-7">
                <div
                  aria-hidden="true"
                  className="text-3xl"
                >
                  👥
                </div>

                <h3 className="mt-4 text-xl font-bold text-blue-950">
                  Considere o seu grupo
                </h3>

                <p className="mt-3 leading-7 text-zinc-600">
                  Confira a capacidade da casa, a
                  quantidade de quartos, camas e
                  banheiros disponíveis.
                </p>
              </article>

              <article className="rounded-3xl border border-zinc-200 bg-zinc-50 p-7">
                <div
                  aria-hidden="true"
                  className="text-3xl"
                >
                  🏊
                </div>

                <h3 className="mt-4 text-xl font-bold text-blue-950">
                  Verifique as comodidades
                </h3>

                <p className="mt-3 leading-7 text-zinc-600">
                  Use os filtros para encontrar
                  piscina, churrasqueira, Wi-Fi,
                  ar-condicionado e imóveis que
                  aceitam animais.
                </p>
              </article>
            </div>

            <div className="mt-20">
              <div className="max-w-3xl">
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
                  Regiões de Búzios
                </p>

                <h2 className="mt-3 text-3xl font-bold text-blue-950">
                  Encontre uma localização adequada
                  para sua viagem
                </h2>

                <p className="mt-4 leading-7 text-zinc-600">
                  Conheça algumas das regiões onde
                  estão localizadas nossas casas de
                  temporada.
                </p>
              </div>

              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {regions.map((region) => (
                  <Link
                    key={region.name}
                    href={region.href}
                    className="group rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg"
                  >
                    <h3 className="text-xl font-bold text-blue-950">
                      {region.name}
                    </h3>

                    <p className="mt-3 leading-7 text-zinc-600">
                      {region.description}
                    </p>

                    <span className="mt-5 inline-flex font-bold text-sky-700">
                      Ver imóvel{" "}
                      <span
                        aria-hidden="true"
                        className="ml-2 transition group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-20 rounded-[2rem] bg-blue-950 px-7 py-10 text-center text-white sm:px-12">
              <h2 className="text-3xl font-bold">
                Precisa de ajuda para escolher?
              </h2>

              <p className="mx-auto mt-4 max-w-2xl leading-7 text-blue-100">
                Informe as datas, a quantidade de
                hóspedes e suas preferências. Nossa
                equipe indicará as opções mais
                adequadas para sua viagem.
              </p>

              <a
                href="https://wa.me/5524998288846?text=Olá! Gostaria de ajuda para escolher uma casa de temporada em Búzios."
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-green-600 px-7 py-3 font-bold text-white shadow-lg transition hover:-translate-y-1 hover:bg-green-700"
              >
                Receber ajuda pelo WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}