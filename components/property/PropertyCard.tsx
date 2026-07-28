import Link from "next/link";

import type { Property } from "@/types/Property";
import PropertyCardImage from "@/components/property/PropertyCardImage";

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({
  property,
}: PropertyCardProps) {
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
    !property.neighborhood.toUpperCase().includes("EDITAR")
      ? property.neighborhood
      : "Armação dos Búzios";

  const hasBasicInformation =
    property.guests > 0 ||
    property.bedrooms > 0 ||
    property.bathrooms > 0 ||
    property.garage > 0;

  return (
    <article className="group overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl">
      <Link
        href={`/imoveis/${property.id}`}
        className="block"
        aria-label={`Conhecer o imóvel ${property.title}`}
      >
        {/* Foto */}
        <div className="relative h-72 overflow-hidden bg-zinc-100">
          <PropertyCardImage
            src={property.image}
            alt={property.title}
          />

          {/* Avaliação */}
          {property.rating > 0 && (
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 font-bold text-zinc-900 shadow-md backdrop-blur">
              <span aria-hidden="true">⭐</span>

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

                <span className="text-sm font-medium">
                  /noite
                </span>
              </>
            ) : (
              "Sob consulta"
            )}
          </div>
        </div>

        {/* Informações */}
        <div className="p-7">
          <h2 className="text-2xl font-bold text-blue-950 transition group-hover:text-sky-700">
            {property.title}
          </h2>

          <p className="mt-3 flex items-center gap-2 text-zinc-500">
            <span aria-hidden="true">📍</span>
            {neighborhood}
          </p>

          {hasBasicInformation ? (
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm text-zinc-700">
              {property.guests > 0 && (
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">👥</span>

                  {property.guests}{" "}
                  {property.guests === 1
                    ? "hóspede"
                    : "hóspedes"}
                </span>
              )}

              {property.bedrooms > 0 && (
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">🛏️</span>

                  {property.bedrooms}{" "}
                  {property.bedrooms === 1
                    ? "quarto"
                    : "quartos"}
                </span>
              )}

              {property.bathrooms > 0 && (
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">🚿</span>

                  {property.bathrooms}{" "}
                  {property.bathrooms === 1
                    ? "banheiro"
                    : "banheiros"}
                </span>
              )}

              {property.garage > 0 && (
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">🚗</span>

                  {property.garage}{" "}
                  {property.garage === 1
                    ? "vaga"
                    : "vagas"}
                </span>
              )}
            </div>
          ) : (
            <p className="mt-6 text-sm text-zinc-500">
              Informações completas em atualização.
            </p>
          )}

          {/* Comodidades */}
          <div className="mt-6 flex flex-wrap gap-2">
            {property.pool && (
              <span className="rounded-full bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-800">
                🏊 Piscina
              </span>
            )}

            {property.barbecue && (
              <span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-800">
                🔥 Churrasqueira
              </span>
            )}

            {property.petFriendly && (
              <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
                🐾 Aceita pets
              </span>
            )}

            {property.wifi && (
              <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-800">
                📶 Wi-Fi
              </span>
            )}

            {property.airConditioning && (
              <span className="rounded-full bg-cyan-100 px-4 py-2 text-sm font-semibold text-cyan-800">
                ❄️ Ar-condicionado
              </span>
            )}
          </div>

          <div className="mt-7 flex items-center justify-between border-t border-zinc-100 pt-5">
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