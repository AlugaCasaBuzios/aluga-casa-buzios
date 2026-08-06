import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getActiveProperties,
  getActivePropertyById,
} from "@/lib/propertyCatalog";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

import BookingQuote from "@/components/property/BookingQuote";
import PropertyAmenities from "@/components/property/PropertyAmenities";
import PropertyGallery from "@/components/property/PropertyGallery";
import PropertyMap from "@/components/property/PropertyMap";
import PropertyReviews from "@/components/property/PropertyReviews";
import PropertyShare from "@/components/property/PropertyShare";
import PropertySummary from "@/components/property/PropertySummary";
import RelatedProperties from "@/components/property/RelatedProperties";

export const dynamic =
  "force-dynamic";

const siteUrl =
  "https://alugacasabuzios.com.br";

interface PropertyPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: PropertyPageProps): Promise<Metadata> {
  const { id } = await params;

  const property =
    await getActivePropertyById(id);

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

  const absolutePropertyImage =
    propertyImage.startsWith("http")
      ? propertyImage
      : `${siteUrl}${propertyImage}`;

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
          url: absolutePropertyImage,
          alt: `${property.title} em Armação dos Búzios`,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absolutePropertyImage],
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

  const [
    property,
    activeProperties,
  ] = await Promise.all([
    getActivePropertyById(id),
    getActiveProperties(),
  ]);

  if (!property) {
    notFound();
  }

  const propertyUrl =
    `${siteUrl}/imoveis/${property.id}`;

  const propertyImages = Array.from(
    new Set(
      [
        property.image,
        ...property.gallery,
      ]
        .filter(
          (image): image is string =>
            typeof image === "string" &&
            image.trim() !== ""
        )
        .map((image) =>
          image.startsWith("http")
            ? image
            : `${siteUrl}${image}`
        )
    )
  );

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

  const amenityFeature = [
    {
      "@type":
        "LocationFeatureSpecification",
      name: "Wi-Fi",
      value: property.wifi,
    },
    {
      "@type":
        "LocationFeatureSpecification",
      name: "Piscina",
      value: property.pool,
    },
    {
      "@type":
        "LocationFeatureSpecification",
      name: "Ar-condicionado",
      value:
        property.airConditioning,
    },
    {
      "@type":
        "LocationFeatureSpecification",
      name: "Cozinha",
      value: property.kitchen,
    },
    {
      "@type":
        "LocationFeatureSpecification",
      name: "Churrasqueira",
      value: property.barbecue,
    },
    {
      "@type":
        "LocationFeatureSpecification",
      name: "Máquina de lavar",
      value:
        property.washingMachine,
    },
    {
      "@type":
        "LocationFeatureSpecification",
      name: "Aceita animais",
      value: property.petFriendly,
    },
  ];

  const propertyJsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",

    "@id": `${propertyUrl}#property`,

    name: property.title,
    url: propertyUrl,
    description:
      property.description,
    image: propertyImages,

    telephone: "+55 24 99828-8846",

    priceRange:
      property.price > 0
        ? `A partir de R$ ${property.price} por diária`
        : "Valores sob consulta",

    address: {
      "@type": "PostalAddress",

      ...(property.address
        ? {
            streetAddress:
              property.address,
          }
        : {}),

      addressLocality:
        "Armação dos Búzios",
      addressRegion: "RJ",
      addressCountry: "BR",
    },

    ...(property.latitude !==
      undefined &&
    property.longitude !== undefined
      ? {
          geo: {
            "@type":
              "GeoCoordinates",
            latitude:
              property.latitude,
            longitude:
              property.longitude,
          },
        }
      : {}),

    amenityFeature,

    numberOfRooms:
      property.bedrooms,

    petsAllowed:
      property.petFriendly,

    checkinTime:
      property.checkin,

    checkoutTime:
      property.checkout,

    aggregateRating:
      property.rating > 0 &&
      property.reviews > 0
        ? {
            "@type":
              "AggregateRating",
            ratingValue:
              property.rating,
            ratingCount:
              property.reviews,
            reviewCount:
              property.reviews,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,

    ...(property.price > 0
      ? {
          makesOffer: {
            "@type": "Offer",
            url: propertyUrl,
            priceCurrency: "BRL",
            price: property.price,
            availability:
              "https://schema.org/InStock",
            description:
              "Valor inicial da diária. Consulte disponibilidade e valor final para as datas desejadas.",
          },
        }
      : {}),

    containedInPlace: {
      "@type": "City",
      name: "Armação dos Búzios",

      address: {
        "@type":
          "PostalAddress",
        addressRegion: "RJ",
        addressCountry: "BR",
      },
    },

    sameAs: [
      property.airbnb,
      ...(property.booking
        ? [property.booking]
        : []),
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
            ).replace(
              /</g,
              "\\u003c"
            ),
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              propertyJsonLd
            ).replace(
              /</g,
              "\\u003c"
            ),
          }}
        />

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

        <PropertyGallery
          property={property}
        />

        <section className="mx-auto mt-8 max-w-7xl px-6">
          <PropertySummary
            property={property}
          />

          <div className="mt-5 flex justify-end">
            <PropertyShare
              propertyId={
                property.id
              }
              propertyTitle={
                property.title
              }
            />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,2fr)_420px]">
            <div>
              <section>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
                  Conheça o imóvel
                </p>

                <h1 className="mt-3 text-3xl font-bold text-blue-950 sm:text-4xl">
                  {property.title}
                </h1>

                <p className="mt-5 text-lg leading-8 text-zinc-700">
                  {
                    property.description
                  }
                </p>
              </section>

              <div className="mt-14">
                <PropertyAmenities
                  amenities={
                    property.amenities
                  }
                />
              </div>

              <div className="mt-14">
                <PropertyReviews
                  rating={
                    property.rating
                  }
                  reviewsCount={
                    property.reviews
                  }
                  airbnbUrl={
                    property.airbnb
                  }
                />
              </div>

              <PropertyMap
                property={property}
              />

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
                      Horário de
                      check-in
                    </p>

                    <p className="mt-2 text-xl font-bold text-blue-950">
                      A partir das{" "}
                      {
                        property.checkin
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl bg-blue-50 p-6">
                    <p className="text-sm font-medium text-zinc-500">
                      Horário de
                      check-out
                    </p>

                    <p className="mt-2 text-xl font-bold text-blue-950">
                      Até as{" "}
                      {
                        property.checkout
                      }
                    </p>
                  </div>
                </div>
              </section>

              <div className="mt-14 border-t border-zinc-200 pt-10">
                <Link
                  href="/casas"
                  className="inline-flex items-center justify-center rounded-full border border-blue-950 px-7 py-3 font-bold text-blue-950 transition hover:bg-blue-950 hover:text-white"
                >
                  ← Voltar para todas
                  as casas
                </Link>
              </div>
            </div>

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2">
                <BookingQuote
                  propertyId={
                    property.id
                  }
                  propertyTitle={
                    property.title
                  }
                  whatsapp={
                    property.whatsapp
                  }
                  maximumGuests={
                    property.guests
                  }
                />
              </div>
            </aside>
          </div>

        </section>

        <RelatedProperties
          property={property}
          properties={
            activeProperties
          }
        />
      </main>

      <Footer />
    </>
  );
}