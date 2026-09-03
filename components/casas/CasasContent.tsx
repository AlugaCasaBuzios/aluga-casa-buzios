"use client";

import { useEffect, useMemo, useState } from "react";

import { usePropertySearch } from "@/hooks/usePropertySearch";
import type { Property } from "@/types/Property";

import SearchBar from "@/components/home/SearchBar";
import Filters from "@/components/home/Filters";
import PropertyCard from "@/components/property/PropertyCard";

type CasasContentProps = {
  properties: Property[];
};

type PropertySort =
  | "recommended"
  | "price-asc"
  | "price-desc"
  | "guests-desc"
  | "rating-desc";

function isPropertySort(
  value: string | null
): value is PropertySort {
  return (
    value === "recommended" ||
    value === "price-asc" ||
    value === "price-desc" ||
    value === "guests-desc" ||
    value === "rating-desc"
  );
}

const FAVORITES_STORAGE_KEY =
  "aluga-casa-buzios:favorite-properties";

const FAVORITES_CHANGED_EVENT =
  "aluga-casa-buzios:favorites-changed";

function readFavoritePropertyIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored =
      window.localStorage.getItem(
        FAVORITES_STORAGE_KEY
      );

    if (!stored) {
      return [];
    }

    const parsed: unknown =
      JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is string =>
        typeof item === "string" &&
        item.trim().length > 0
    );
  } catch (error) {
    console.error(
      "Erro ao carregar imóveis favoritos:",
      error
    );

    return [];
  }
}

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

  const [
    neighborhood,
    setNeighborhood,
  ] = useState("");

  const [
    sort,
    setSort,
  ] = useState<PropertySort>(
    "recommended"
  );

  const [
    urlStateReady,
    setUrlStateReady,
  ] = useState(false);

  const [
    shareFeedback,
    setShareFeedback,
  ] = useState("");

  const [
    favoritePropertyIds,
    setFavoritePropertyIds,
  ] = useState<string[]>([]);

  const [
    favoriteOnly,
    setFavoriteOnly,
  ] = useState(false);

  useEffect(() => {
    function syncFavorites() {
      setFavoritePropertyIds(
        readFavoritePropertyIds()
      );
    }

    syncFavorites();

    window.addEventListener(
      "storage",
      syncFavorites
    );

    window.addEventListener(
      FAVORITES_CHANGED_EVENT,
      syncFavorites
    );

    return () => {
      window.removeEventListener(
        "storage",
        syncFavorites
      );

      window.removeEventListener(
        FAVORITES_CHANGED_EVENT,
        syncFavorites
      );
    };
  }, []);

  useEffect(() => {
    function applyUrlState() {
      const params =
        new URLSearchParams(
          window.location.search
        );

      const urlSearch =
        params.get("q") ?? "";

      const urlGuests =
        Number.parseInt(
          params.get("hospedes") ?? "0",
          10
        );

      const urlNeighborhood =
        params.get("bairro") ?? "";

      const urlSort =
        params.get("ordem");

      setSearch(urlSearch);

      setGuests(
        Number.isFinite(urlGuests) &&
          urlGuests > 0
          ? urlGuests
          : 0
      );

      setNeighborhood(
        urlNeighborhood
      );

      setPool(
        params.get("piscina") === "1"
      );

      setPetFriendly(
        params.get("pets") === "1"
      );

      setBarbecue(
        params.get(
          "churrasqueira"
        ) === "1"
      );

      setSort(
        isPropertySort(urlSort)
          ? urlSort
          : "recommended"
      );

      setUrlStateReady(true);
    }

    applyUrlState();

    window.addEventListener(
      "popstate",
      applyUrlState
    );

    return () => {
      window.removeEventListener(
        "popstate",
        applyUrlState
      );
    };
  }, [
    setBarbecue,
    setGuests,
    setPetFriendly,
    setPool,
    setSearch,
  ]);

  useEffect(() => {
    if (!urlStateReady) {
      return;
    }

    const url =
      new URL(
        window.location.href
      );

    const params =
      url.searchParams;

    const normalizedSearch =
      search.trim();

    if (normalizedSearch) {
      params.set(
        "q",
        normalizedSearch
      );
    } else {
      params.delete("q");
    }

    if (guests > 0) {
      params.set(
        "hospedes",
        String(guests)
      );
    } else {
      params.delete("hospedes");
    }

    if (neighborhood) {
      params.set(
        "bairro",
        neighborhood
      );
    } else {
      params.delete("bairro");
    }

    if (pool) {
      params.set(
        "piscina",
        "1"
      );
    } else {
      params.delete("piscina");
    }

    if (petFriendly) {
      params.set(
        "pets",
        "1"
      );
    } else {
      params.delete("pets");
    }

    if (barbecue) {
      params.set(
        "churrasqueira",
        "1"
      );
    } else {
      params.delete(
        "churrasqueira"
      );
    }

    if (
      sort !== "recommended"
    ) {
      params.set(
        "ordem",
        sort
      );
    } else {
      params.delete("ordem");
    }

    const nextUrl =
      `${url.pathname}${
        params.toString()
          ? `?${params.toString()}`
          : ""
      }${url.hash}`;

    window.history.replaceState(
      window.history.state,
      "",
      nextUrl
    );
  }, [
    barbecue,
    guests,
    neighborhood,
    petFriendly,
    pool,
    search,
    sort,
    urlStateReady,
  ]);

  const neighborhoods = useMemo(
    () =>
      Array.from(
        new Set(
          properties
            .map((property) =>
              property.neighborhood?.trim()
            )
            .filter(
              (
                item
              ): item is string =>
                Boolean(item)
            )
        )
      ).sort((a, b) =>
        a.localeCompare(
          b,
          "pt-BR"
        )
      ),
    [properties]
  );

  const neighborhoodFilteredProperties =
    useMemo(
      () =>
        neighborhood
          ? filteredProperties.filter(
              (property) =>
                property.neighborhood?.trim() ===
                neighborhood
            )
          : filteredProperties,
      [
        filteredProperties,
        neighborhood,
      ]
    );

  const favoritePropertyIdSet =
    useMemo(
      () =>
        new Set(
          favoritePropertyIds
        ),
      [favoritePropertyIds]
    );

  const favoriteCount =
    useMemo(
      () =>
        properties.filter(
          (property) =>
            favoritePropertyIdSet.has(
              property.id
            )
        ).length,
      [
        favoritePropertyIdSet,
        properties,
      ]
    );

  const favoriteFilteredProperties =
    useMemo(
      () =>
        favoriteOnly
          ? neighborhoodFilteredProperties.filter(
              (property) =>
                favoritePropertyIdSet.has(
                  property.id
                )
            )
          : neighborhoodFilteredProperties,
      [
        favoriteOnly,
        favoritePropertyIdSet,
        neighborhoodFilteredProperties,
      ]
    );

  const sortedProperties =
    useMemo(() => {
      const result = [
        ...favoriteFilteredProperties,
      ];

      switch (sort) {
        case "price-asc":
          return result.sort(
            (a, b) => {
              const aPrice =
                a.price > 0
                  ? a.price
                  : Number.POSITIVE_INFINITY;

              const bPrice =
                b.price > 0
                  ? b.price
                  : Number.POSITIVE_INFINITY;

              return aPrice - bPrice;
            }
          );

        case "price-desc":
          return result.sort(
            (a, b) => {
              if (
                a.price <= 0 &&
                b.price <= 0
              ) {
                return 0;
              }

              if (a.price <= 0) {
                return 1;
              }

              if (b.price <= 0) {
                return -1;
              }

              return b.price - a.price;
            }
          );

        case "guests-desc":
          return result.sort(
            (a, b) =>
              b.guests - a.guests ||
              b.rating - a.rating
          );

        case "rating-desc":
          return result.sort(
            (a, b) =>
              b.rating - a.rating ||
              b.reviews - a.reviews
          );

        case "recommended":
        default:
          return result;
      }
    }, [
      favoriteFilteredProperties,
      sort,
    ]);

  function clearFilters() {
    setSearch("");
    setGuests(0);
    setNeighborhood("");
    setPool(false);
    setPetFriendly(false);
    setBarbecue(false);
    setSort("recommended");
    setFavoriteOnly(false);
  }

  async function shareCurrentSearch() {
    const shareData = {
      title:
        "Casas para temporada em Búzios",
      text:
        "Confira esta seleção de casas para temporada em Búzios.",
      url: window.location.href,
    };

    try {
      if (
        typeof navigator.share ===
        "function"
      ) {
        await navigator.share(
          shareData
        );

        setShareFeedback(
          "Busca compartilhada"
        );
      } else {
        await navigator.clipboard.writeText(
          window.location.href
        );

        setShareFeedback(
          "Link copiado"
        );
      }

      window.setTimeout(
        () =>
          setShareFeedback(""),
        2500
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.error(
        "Erro ao compartilhar busca:",
        error
      );

      try {
        await navigator.clipboard.writeText(
          window.location.href
        );

        setShareFeedback(
          "Link copiado"
        );

        window.setTimeout(
          () =>
            setShareFeedback(""),
          2500
        );
      } catch (
        clipboardError
      ) {
        console.error(
          "Erro ao copiar link da busca:",
          clipboardError
        );

        window.prompt(
          "Copie o link desta busca:",
          window.location.href
        );
      }
    }
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    guests > 0 ||
    neighborhood !== "" ||
    pool ||
    petFriendly ||
    barbecue ||
    favoriteOnly;

  const sortLabels: Record<
    PropertySort,
    string
  > = {
    recommended: "Recomendados",
    "price-asc": "Menor diária",
    "price-desc": "Maior diária",
    "guests-desc": "Maior capacidade",
    "rating-desc": "Melhor avaliação",
  };

  const activeFilterTags: {
    key: string;
    label: string;
    onRemove: () => void;
  }[] = [];

  if (search.trim()) {
    activeFilterTags.push({
      key: "search",
      label: `Pesquisa: ${search.trim()}`,
      onRemove: () =>
        setSearch(""),
    });
  }

  if (neighborhood) {
    activeFilterTags.push({
      key: "neighborhood",
      label: `Bairro: ${neighborhood}`,
      onRemove: () =>
        setNeighborhood(""),
    });
  }

  if (guests > 0) {
    activeFilterTags.push({
      key: "guests",
      label: `${guests}+ ${
        guests === 1
          ? "hóspede"
          : "hóspedes"
      }`,
      onRemove: () =>
        setGuests(0),
    });
  }

  if (pool) {
    activeFilterTags.push({
      key: "pool",
      label: "Piscina",
      onRemove: () =>
        setPool(false),
    });
  }

  if (petFriendly) {
    activeFilterTags.push({
      key: "pets",
      label: "Pet Friendly",
      onRemove: () =>
        setPetFriendly(false),
    });
  }

  if (barbecue) {
    activeFilterTags.push({
      key: "barbecue",
      label: "Churrasqueira",
      onRemove: () =>
        setBarbecue(false),
    });
  }

  if (sort !== "recommended") {
    activeFilterTags.push({
      key: "sort",
      label:
        `Ordenação: ${sortLabels[sort]}`,
      onRemove: () =>
        setSort("recommended"),
    });
  }

  if (favoriteOnly) {
    activeFilterTags.push({
      key: "favorites",
      label: "Somente favoritos",
      onRemove: () =>
        setFavoriteOnly(false),
    });
  }

  const hasActiveSelections =
    activeFilterTags.length > 0;

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
          neighborhood={neighborhood}
          setNeighborhood={setNeighborhood}
          neighborhoods={neighborhoods}
          pool={pool}
          setPool={setPool}
          petFriendly={petFriendly}
          setPetFriendly={setPetFriendly}
          barbecue={barbecue}
          setBarbecue={setBarbecue}
        />
      </div>

      {hasActiveSelections && (
        <div className="mx-auto mt-8 max-w-7xl px-6">
          <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-black text-blue-950">
                  Filtros aplicados
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {activeFilterTags.map(
                    (tag) => (
                      <button
                        key={tag.key}
                        type="button"
                        onClick={tag.onRemove}
                        title={`Remover ${tag.label}`}
                        aria-label={`Remover filtro ${tag.label}`}
                        className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-bold text-sky-900 shadow-sm transition hover:border-sky-300 hover:bg-sky-100"
                      >
                        <span className="truncate">
                          {tag.label}
                        </span>

                        <span
                          aria-hidden="true"
                          className="text-base leading-none text-sky-600"
                        >
                          ×
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="shrink-0 self-start text-sm font-bold text-sky-700 underline decoration-sky-300 underline-offset-4 transition hover:text-sky-950 lg:self-center"
              >
                Limpar tudo
              </button>
            </div>
          </div>
        </div>
      )}

      <section
        id="imoveis"
        className="mx-auto max-w-7xl scroll-mt-28 px-6 py-12"
      >
        <div className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-3xl font-bold text-blue-950 sm:text-4xl">
              Escolha sua casa
            </h2>

            <p className="mt-2 text-zinc-600">
              Encontramos {favoriteFilteredProperties.length}{" "}
              {favoriteFilteredProperties.length === 1
                ? "imóvel"
                : "imóveis"}
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setFavoriteOnly(
                  (current) =>
                    !current
                )
              }
              aria-pressed={favoriteOnly}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-5 py-3 font-bold transition ${
                favoriteOnly
                  ? "border-red-200 bg-red-50 text-red-700 shadow-sm"
                  : "border-zinc-300 bg-white text-zinc-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              }`}
            >
              <span
                aria-hidden="true"
                className="text-xl leading-none"
              >
                {favoriteOnly
                  ? "♥"
                  : "♡"}
              </span>

              Somente favoritos

              {favoriteCount > 0 && (
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-black">
                  {favoriteCount}
                </span>
              )}
            </button>

            <select
              aria-label="Ordenar por"
              value={sort}
              onChange={(event) =>
                setSort(
                  event.target
                    .value as PropertySort
                )
              }
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 font-semibold text-zinc-800 shadow-sm outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
            >
              <option value="recommended">
                Recomendados
              </option>

              <option value="price-asc">
                Menor diária
              </option>

              <option value="price-desc">
                Maior diária
              </option>

              <option value="guests-desc">
                Maior capacidade
              </option>

              <option value="rating-desc">
                Melhor avaliação
              </option>
            </select>

            {hasActiveSelections && (
              <button
                type="button"
                onClick={clearFilters}
                className="font-bold text-sky-700 transition hover:text-sky-900"
              >
                Limpar pesquisa e filtros
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                void shareCurrentSearch();
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-6 py-3 font-bold text-sky-800 transition hover:border-sky-300 hover:bg-sky-100"
            >
              <span aria-hidden="true">
                ↗
              </span>

              {shareFeedback ||
                "Compartilhar busca"}
            </button>

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

        {favoriteFilteredProperties.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {sortedProperties.map((property) => (
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
              {favoriteOnly &&
              favoriteCount === 0
                ? "Você ainda não marcou nenhum imóvel como favorito. Clique no coração dos cards para montar sua seleção."
                : "Não encontramos imóveis com essas características. Altere a pesquisa ou remova algum filtro."}
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
