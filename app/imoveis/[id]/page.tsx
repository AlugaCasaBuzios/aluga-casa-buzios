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

  const property = properties.find((item) => item.id === id);

  if (!property) {
    return {
      title: "Imóvel não encontrado",
    };
  }

  return {
    title: property.title,
    description: property.description,
    keywords: property.keywords,
  };
}

export default async function PropertyPage({
  params,
}: PropertyPageProps) {
  const { id } = await params;

  const property = properties.find((item) => item.id === id);

  if (!property) {
    notFound();
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-zinc-50">
        {/* Navegação */}
        <section className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-6 py-5 text-sm">
            <Link
              href="/"
              className="font-medium text-zinc-500 transition hover:text-sky-700"
            >
              Início
            </Link>

            <span className="text-zinc-300">/</span>

            <Link
              href="/casas"
              className="font-medium text-zinc-500 transition hover:text-sky-700"
            >
              Casas
            </Link>

            <span className="text-zinc-300">/</span>

            <span className="font-semibold text-blue-950">
              {property.title}
            </span>
          </div>
        </section>

        {/* Galeria */}
        <PropertyGallery property={property} />

        {/* Resumo */}
        <section className="mx-auto mt-8 max-w-7xl px-6">
          <PropertySummary property={property} />
        </section>

        {/* Informações do imóvel */}
        <section className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,2fr)_420px]">
            {/* Coluna principal */}
            <div>
              <section>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
                  Conheça o imóvel
                </p>

                <h2 className="mt-3 text-3xl font-bold text-blue-950">
                  Sobre este imóvel
                </h2>

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

              <PropertyMap property={property} />

              {/* Regras */}
              <section className="mt-16">
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
                  Informações importantes
                </p>

                <h2 className="mt-3 text-3xl font-bold text-blue-950">
                  Regras da hospedagem
                </h2>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {property.rules.map((rule) => (
                    <div
                      key={rule}
                      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                    >
                      <p className="font-medium text-zinc-700">
                        ✓ {rule}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-blue-50 p-6">
                    <p className="text-sm font-medium text-zinc-500">
                      Horário de check-in
                    </p>

                    <p className="mt-2 text-xl font-bold text-blue-950">
                      A partir das {property.checkin}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-blue-50 p-6">
                    <p className="text-sm font-medium text-zinc-500">
                      Horário de check-out
                    </p>

                    <p className="mt-2 text-xl font-bold text-blue-950">
                      Até as {property.checkout}
                    </p>
                  </div>
                </div>
              </section>

              {/* Voltar para as casas */}
              <div className="mt-14 border-t border-zinc-200 pt-10">
                <Link
                  href="/casas"
                  className="inline-flex items-center justify-center rounded-full border border-blue-950 px-7 py-3 font-bold text-blue-950 transition hover:bg-blue-950 hover:text-white"
                >
                  ← Voltar para todas as casas
                </Link>
              </div>
            </div>

            {/* Painel de reserva */}
            <aside className="lg:sticky lg:top-32">
              <PropertyReservation property={property} />
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}