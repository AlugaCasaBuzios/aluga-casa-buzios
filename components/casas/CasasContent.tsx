"use client";

import { usePropertySearch } from "@/hooks/usePropertySearch";
import type { Property } from "@/types/Property";

import SearchBar from "@/components/home/SearchBar";
import Filters from "@/components/home/Filters";
import PropertyCard from "@/components/property/PropertyCard";

type CasasContentProps = {
  properties: Property[];
};

export default function CasasContent({
  properties,
}: CasasContentProps) {
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

  function clearFilters() {
    setSearch("");
    setGuests(0);
    setPool(false);
    setPetFriendly(false);
    setBarbecue(false);
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    guests > 0 ||
    pool ||
    petFriendly ||
    barbecue;

  return (
    <>
      <section className="bg-blue-950 px-6 pb-32 pt-20 text-center text-white">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-sky-300">
            Aluga Casa Búzios
          </p>

          <h1 className="mt-4 text-4xl font-black sm:text-5xl">
            Casas para temporada em Búzios
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/80">
            Pesquise pelo nome, bairro ou característica e encontre a
            propriedade ideal para sua viagem.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-20 max-w-5xl px-6">
        <SearchBar
          search={search}
          setSearch={setSearch}
        />
      </section>

      <div className="mt-10">
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
      </div>

      <section
        id="imoveis"
        className="mx-auto max-w-7xl scroll-mt-28 px-6 py-20"
      >
        <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
              Propriedades disponíveis
            </p>

            <h2 className="mt-3 text-3xl font-bold text-blue-950 sm:text-4xl">
              Escolha sua casa
            </h2>

            <p className="mt-3 text-zinc-600">
              Encontramos {filteredProperties.length}{" "}
              {filteredProperties.length === 1
                ? "imóvel"
                : "imóveis"}
              .
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="font-bold text-sky-700 transition hover:text-sky-900"
              >
                Limpar pesquisa e filtros
              </button>
            )}

            <a
              href="https://wa.me/5524998288846?text=Olá! Gostaria de consultar as casas disponíveis para temporada em Búzios."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-green-600 px-6 py-3 font-bold text-white shadow-lg transition hover:-translate-y-1 hover:bg-green-700"
            >
              Consultar disponibilidade
            </a>
          </div>
        </div>

        {filteredProperties.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm sm:p-14">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sky-100 text-4xl">
              🔎
            </div>

            <h2 className="mt-6 text-2xl font-bold text-blue-950">
              Nenhuma casa encontrada
            </h2>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-zinc-600">
              Não encontramos imóveis com essas características. Altere a
              pesquisa ou remova algum filtro.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-7 rounded-full bg-blue-950 px-7 py-3 font-bold text-white shadow-lg transition hover:bg-blue-900"
            >
              Mostrar todas as casas
            </button>
          </div>
        )}
      </section>

      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl rounded-[2rem] bg-sky-50 p-8 text-center sm:p-12">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
            Atendimento personalizado
          </p>

          <h2 className="mt-4 text-3xl font-bold text-blue-950">
            Não encontrou exatamente o que procura?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-zinc-600">
            Informe suas datas, quantidade de hóspedes e preferências. Nossa
            equipe ajudará a encontrar a melhor opção disponível.
          </p>

          <a
            href="https://wa.me/5524998288846?text=Olá! Preciso de ajuda para encontrar uma casa em Búzios."
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex rounded-full bg-green-600 px-8 py-4 font-bold text-white shadow-lg transition hover:-translate-y-1 hover:bg-green-700"
          >
            Falar com a equipe
          </a>
        </div>
      </section>
    </>
  );
}
