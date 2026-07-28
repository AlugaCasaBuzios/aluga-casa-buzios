import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { properties } from "@/app/data/properties";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

import PropertyGallery from "@/components/property/PropertyGallery";
import PropertySummary from "@/components/property/PropertySummary";
import PropertyAmenities from "@/components/property/PropertyAmenities";
import PropertyReviews from "@/components/property/PropertyReviews";
import PropertyReservation from "@/components/property/PropertyReservation";
import PropertyMap from "@/components/property/PropertyMap";

const siteUrl = "https://alugacasabuzios.com.br";

interface PropertyPageProps {
  params: Promise<{
    id: string;
  }>;
}

export function generateStaticParams() {
  return properties.map((property) => ({
    id: property.id,
  }));
}

export async function generateMetadata({
  params,
}: PropertyPageProps): Promise<Metadata> {
  const { id } = await params;

  const property = properties.find(
    (item) => item.id === id
  );

  if (!property) {
    return {
      title: "Imóvel não encontrado",
      description:
        "O imóvel solicitado não foi encontrado.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const propertyUrl =
    `${siteUrl}/imoveis/${property.id}`;

  const propertyImage =
    property.gallery.find(
      (image) =>
        typeof image === "string" &&
        image.trim() !== ""
    ) || property.image;

  const title =
    `${property.title} — Casa de temporada em Búzios`;

  const description =
    property.description ||
    `${property.title}, casa de temporada em ${property.neighborhood}, Armação dos Búzios.`;

  return {
    title,

    description,

    keywords: property.keywords,

    alternates: {
      canonical: propertyUrl,
    },

    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: propertyUrl,
      siteName: "Aluga Casa Búzios",
      title,
      description,

      images: [
        {
          url: propertyImage,
          alt: `${property.title} em Armação dos Búzios`,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,

      images: [
        propertyImage,
      ],
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function PropertyPage({
  params,
}: PropertyPageProps) {
  const { id } = await params;

  const property = properties.find(
    (item) => item.id === id
  );

  if (!property) {
    notFound();
  }

  const propertyUrl =
    `${siteUrl}/imoveis/${property.id}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",

    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Início",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Casas",
        item: `${siteUrl}/casas`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: property.title,
        item: propertyUrl,
      },
    ],
  };

  return (
    <>
      <Header />

      <main className="min-h-screen bg-zinc-50">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              breadcrumbJsonLd
            ).replace(/</g, "\\u003c"),
          }}
        />

        {/* Navegação */}
        <section className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-6 py-5 text-sm">
            <Link
              href="/"
              className="font-medium text-zinc-500 transition hover:text-sky-700"
            >
              Início
            </Link>

            <span className="text-zinc-300">
              /
            </span>

            <Link
              href="/casas"
              className="font-medium text-zinc-500 transition hover:text-sky-700"
            >
              Casas
            </Link>

            <span className="text-zinc-300">
              /
            </span>

            <span className="font-semibold text-blue-950">
              {property.title}
            </span>
          </div>
        </section>

        {/* Galeria */}
        <PropertyGallery
          property={property}
        />

        {/* Resumo */}
        <section className="mx-auto mt-8 max-w-7xl px-6">
          <PropertySummary
            property={property}
          />
        </section>

        {/* Informações */}
        <section className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,2fr)_420px]">
            {/* Coluna principal */}
            <div>
              <section>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
                  Conheça o imóvel
                </p>

                <h1 className="mt-3 text-3xl font-bold text-blue-950 sm:text-4xl">
                  {property.title}
                </h1>

                <p className="mt-5 text-lg leading-8 text-zinc-700">
                  {property.description}
                </p>
              </section>

              <div className="mt-14">
                <PropertyAmenities
                  amenities={property.amenities}
                />
              </div>

              <div className="mt-14">
                <PropertyReviews
                  rating={property.rating}
                  reviewsCount={property.reviews}
                />
              </div>

              <PropertyMap
                property={property}
              />

              {/* Regras */}
              <section className="mt-16">
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
                  Informações importantes
                </p>

                <h2 className="mt-3 text-3xl font-bold text-blue-950">
                  Regras da hospedagem
                </h2>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {property.rules.map(
                    (rule) => (
                      <div
                        key={rule}
                        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                      >
                        <p className="font-medium text-zinc-700">
                          ✓ {rule}
                        </p>
                      </div>
                    )
                  )}
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-blue-50 p-6">
                    <p className="text-sm font-medium text-zinc-500">
                      Horário de check-in
                    </p>

                    <p className="mt-2 text-xl font-bold text-blue-950">
                      A partir das{" "}
                      {property.checkin}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-blue-50 p-6">
                    <p className="text-sm font-medium text-zinc-500">
                      Horário de check-out
                    </p>

                    <p className="mt-2 text-xl font-bold text-blue-950">
                      Até as{" "}
                      {property.checkout}
                    </p>
                  </div>
                </div>
              </section>

              {/* Voltar */}
              <div className="mt-14 border-t border-zinc-200 pt-10">
                <Link
                  href="/casas"
                  className="inline-flex items-center justify-center rounded-full border border-blue-950 px-7 py-3 font-bold text-blue-950 transition hover:bg-blue-950 hover:text-white"
                >
                  ← Voltar para todas as casas
                </Link>
              </div>
            </div>

            {/* Reserva */}
            <aside className="lg:sticky lg:top-32">
              <PropertyReservation
                property={property}
              />
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}