"use client";

import { usePropertySearch } from "@/hooks/usePropertySearch";
import type { Property } from "@/types/Property";

import Hero from "@/components/home/Hero";
import Filters from "@/components/home/Filters";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import Testimonials from "@/components/home/Testimonials";
import FAQ from "@/components/home/FAQ";
import PropertyCard from "@/components/property/PropertyCard";

type HomeContentProps = {
  properties: Property[];
};

const MAX_HOME_FEATURED = 3;

export default function HomeContent({
  properties,
}: HomeContentProps) {
  const {
    filteredProperties,

    search,
    setSearch,

    guests,
    setGuests,

    pool,
    setPool,

    petFriendly,
    setPetFriendly,

    barbecue,
    setBarbecue,
  } = usePropertySearch(properties);

  const hasActiveFilters =
    search.trim().length > 0 ||
    guests > 0 ||
    pool ||
    petFriendly ||
    barbecue;

  const featuredProperties =
    filteredProperties
      .filter(
        (property) =>
          property.featured === true
      )
      .slice(
        0,
        MAX_HOME_FEATURED
      );

  const displayedProperties =
    hasActiveFilters
      ? filteredProperties
      : featuredProperties.length > 0
        ? featuredProperties
        : filteredProperties.slice(0, 3);

  function clearFilters() {
    setSearch("");
    setGuests(0);
    setPool(false);
    setPetFriendly(false);
    setBarbecue(false);
  }

  return (
    <>
      <Hero
        search={search}
        setSearch={setSearch}
      />

      <Filters
        guests={guests}
        setGuests={setGuests}
        pool={pool}
        setPool={setPool}
        petFriendly={petFriendly}
        setPetFriendly={setPetFriendly}
        barbecue={barbecue}
        setBarbecue={setBarbecue}
      />

      <section
        id="imoveis"
        className="mx-auto max-w-7xl scroll-mt-28 px-6 py-20"
      >
        <div className="mb-12 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
            Aluga Casa Búzios
          </p>

          <h2 className="mt-3 text-4xl font-bold text-blue-950">
            {hasActiveFilters
              ? "Casas encontradas"
              : "Casas em Destaque"}
          </h2>

          <p className="mt-4 text-lg text-zinc-600">
            Encontramos {displayedProperties.length}{" "}
            {displayedProperties.length === 1
              ? "imóvel"
              : "imóveis"}
            .
          </p>
        </div>

        {displayedProperties.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {displayedProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sky-100 text-4xl">
              🔎
            </div>

            <h3 className="mt-6 text-2xl font-bold text-blue-950">
              {hasActiveFilters
                ? "Nenhum imóvel encontrado"
                : "Nenhum imóvel disponível no momento"}
            </h3>

            <p className="mt-3 text-zinc-600">
              {hasActiveFilters
                ? "Tente alterar a pesquisa ou remover algum filtro."
                : "Assim que houver imóveis ativos, eles aparecerão aqui."}
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 rounded-full bg-blue-950 px-7 py-3 font-bold text-white transition hover:bg-blue-900"
              >
                Limpar pesquisa
              </button>
            )}
          </div>
        )}
      </section>

      <WhyChooseUs />

      <Testimonials
        properties={properties}
      />

      <FAQ />
    </>
  );
}
