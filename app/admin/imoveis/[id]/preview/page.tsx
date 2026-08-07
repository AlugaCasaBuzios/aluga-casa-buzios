import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  getActiveProperties,
  getAdminPropertyById,
} from "@/lib/propertyCatalog";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

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

export const metadata: Metadata = {
  title: "Pré-visualização privada do imóvel",
  description:
    "Pré-visualização administrativa protegida.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

interface PropertyPreviewPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PropertyPreviewPage({
  params,
}: PropertyPreviewPageProps) {
  const { id } = await params;

  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const [
    property,
    activeProperties,
  ] = await Promise.all([
    getAdminPropertyById(id),
    getActiveProperties(),
  ]);

  if (!property) {
    notFound();
  }

  return (
    <>
      <Header />

      <section className="sticky top-0 z-[120] border-b border-amber-300 bg-amber-50 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-amber-950">
              Pré-visualização privada
            </p>

            <p className="mt-1 text-sm text-amber-900">
              Este imóvel está {property.active ? "ativo" : "inativo"}. Somente administradores autenticados podem acessar esta página.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/imoveis/${property.id}`}
              className="rounded-lg bg-blue-950 px-4 py-2 text-sm font-bold !text-white transition hover:bg-blue-900"
            >
              Editar imóvel
            </Link>

            <Link
              href="/admin"
              className="rounded-lg border border-amber-700 bg-white px-4 py-2 text-sm font-bold text-amber-900 transition hover:bg-amber-100"
            >
              Voltar ao painel
            </Link>

            {property.active && (
              <Link
                href={`/imoveis/${property.id}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold !text-white transition hover:bg-green-800"
              >
                Abrir página pública
              </Link>
            )}
          </div>
        </div>
      </section>

      <main className="min-h-screen bg-zinc-50">
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