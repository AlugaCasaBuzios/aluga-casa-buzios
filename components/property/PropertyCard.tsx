"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { Property } from "@/types/Property";
import PropertyCardImage from "@/components/property/PropertyCardImage";

interface PropertyCardProps {
  property: Property;
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

export default function PropertyCard({
  property,
}: PropertyCardProps) {
  const [
    isFavorite,
    setIsFavorite,
  ] = useState(false);

  useEffect(() => {
    function syncFavoriteState() {
      setIsFavorite(
        readFavoritePropertyIds().includes(
          property.id
        )
      );
    }

    syncFavoriteState();

    window.addEventListener(
      "storage",
      syncFavoriteState
    );

    window.addEventListener(
      FAVORITES_CHANGED_EVENT,
      syncFavoriteState
    );

    return () => {
      window.removeEventListener(
        "storage",
        syncFavoriteState
      );

      window.removeEventListener(
        FAVORITES_CHANGED_EVENT,
        syncFavoriteState
      );
    };
  }, [property.id]);

  function toggleFavorite() {
    try {
      const current =
        readFavoritePropertyIds();

      const next = current.includes(
        property.id
      )
        ? current.filter(
            (id) =>
              id !== property.id
          )
        : [
            ...current,
            property.id,
          ];

      window.localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(next)
      );

      setIsFavorite(
        next.includes(property.id)
      );

      window.dispatchEvent(
        new CustomEvent(
          FAVORITES_CHANGED_EVENT,
          {
            detail: next,
          }
        )
      );
    } catch (error) {
      console.error(
        "Erro ao salvar imóvel favorito:",
        error
      );
    }
  }

  const formattedPrice =
    property.price > 0
      ? new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
          maximumFractionDigits: 0,
        }).format(property.price)
      : null;

  const neighborhood =
    property.neighborhood &&
    !property.neighborhood
      .toUpperCase()
      .includes("EDITAR")
      ? property.neighborhood
      : "Armação dos Búzios";

  const hasBasicInformation =
    property.guests > 0 ||
    property.bedrooms > 0 ||
    property.bathrooms > 0 ||
    property.garage > 0;

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl">
      <button
        type="button"
        onClick={toggleFavorite}
        aria-pressed={isFavorite}
        aria-label={
          isFavorite
            ? `Remover ${property.title} dos favoritos`
            : `Adicionar ${property.title} aos favoritos`
        }
        title={
          isFavorite
            ? "Remover dos favoritos"
            : "Adicionar aos favoritos"
        }
        className={`absolute right-4 top-[4.75rem] z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border text-2xl shadow-md backdrop-blur transition ${
          isFavorite
            ? "border-red-200 bg-red-50/95 text-red-600 hover:bg-red-100"
            : "border-white/80 bg-white/95 text-zinc-700 hover:bg-white hover:text-red-500"
        }`}
      >
        <span aria-hidden="true">
          {isFavorite
            ? "♥"
            : "♡"}
        </span>
      </button>

      <Link
        href={`/imoveis/${property.id}`}
        className="block"
        aria-label={`Conhecer o imóvel ${property.title}`}
        data-analytics-event="select_item"
        data-property-id={property.id}
        data-property-title={property.title}
        data-property-neighborhood={neighborhood}
        data-property-price={
          property.price > 0
            ? property.price
            : undefined
        }
      >
        {/* Foto */}
        <div className="relative h-60 overflow-hidden bg-zinc-100">
          <PropertyCardImage
            src={property.image}
            alt={property.title}
          />

          {/* Avaliação */}
          {property.rating > 0 && (
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 font-bold text-zinc-900 shadow-md backdrop-blur">
              <span aria-hidden="true">
                ⭐
              </span>

              <span>
                {property.rating.toFixed(2)}
              </span>
            </div>
          )}

          {/* Preço */}
          <div className="absolute right-4 top-4 rounded-full bg-sky-700 px-4 py-2 font-bold text-white shadow-md">
            {formattedPrice ? (
              <>
                {formattedPrice}

                <span className="ml-1 text-sm font-medium">
                  /noite
                </span>
              </>
            ) : (
              "Sob consulta"
            )}
          </div>
        </div>

        {/* Informações */}
        <div className="p-5">
          <h2 className="text-2xl font-bold text-blue-950 transition group-hover:text-sky-700">
            {property.title}
          </h2>

          <p className="mt-2 flex items-center gap-2 text-zinc-500">
            <span aria-hidden="true">
              📍
            </span>

            {neighborhood}
          </p>

          {hasBasicInformation ? (
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm text-zinc-700">
              {property.guests > 0 && (
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">
                    👥
                  </span>

                  {property.guests}{" "}
                  {property.guests === 1
                    ? "hóspede"
                    : "hóspedes"}
                </span>
              )}

              {property.bedrooms > 0 && (
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">
                    🛏️
                  </span>

                  {property.bedrooms}{" "}
                  {property.bedrooms === 1
                    ? "quarto"
                    : "quartos"}
                </span>
              )}

              {property.bathrooms > 0 && (
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">
                    🚿
                  </span>

                  {property.bathrooms}{" "}
                  {property.bathrooms === 1
                    ? "banheiro"
                    : "banheiros"}
                </span>
              )}

              {property.garage > 0 && (
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">
                    🚗
                  </span>

                  {property.garage}{" "}
                  {property.garage === 1
                    ? "vaga"
                    : "vagas"}
                </span>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              Informações completas em atualização.
            </p>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4">
            <span className="font-bold text-sky-700">
              Ver detalhes
            </span>

            <span
              aria-hidden="true"
              className="text-xl text-sky-700 transition group-hover:translate-x-1"
            >
              →
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
