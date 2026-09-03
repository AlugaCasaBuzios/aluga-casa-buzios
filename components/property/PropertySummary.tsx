import type { Property } from "@/types/Property";

interface Props {
  property: Property;
}

export default function PropertySummary({
  property,
}: Props) {
  const hasReviews =
    property.rating > 0 &&
    property.reviews > 0;

  const hasArea =
    property.area > 0;

  const hasGarage =
    property.garage > 0;

  const formattedRating =
    property.rating.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <section className="rounded-3xl bg-white p-6 shadow-lg md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-950 md:text-4xl">
            {property.title}
          </h1>

          <p className="mt-2 text-lg text-gray-500">
            📍 {property.address}
          </p>
        </div>

        {hasReviews && (
          <div className="w-full rounded-2xl bg-yellow-50 px-6 py-4 text-center lg:w-auto lg:min-w-40">
            <div className="text-3xl font-bold text-yellow-600">
              ⭐ {formattedRating}
            </div>

            <p className="mt-1 text-sm text-gray-500">
              {property.reviews}{" "}
              {property.reviews === 1
                ? "avaliação"
                : "avaliações"}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-zinc-700">
        {[
          `👥 ${property.guests} ${property.guests === 1 ? "hóspede" : "hóspedes"}`,
          `🛏 ${property.bedrooms} ${property.bedrooms === 1 ? "quarto" : "quartos"}`,
          `🛌 ${property.beds} ${property.beds === 1 ? "cama" : "camas"}`,
          `🚿 ${property.bathrooms} ${property.bathrooms === 1 ? "banheiro" : "banheiros"}`,
          ...(hasArea ? [`📐 ${property.area} m²`] : []),
          ...(hasGarage
            ? [
                `🚗 ${property.garage} ${property.garage === 1 ? "vaga" : "vagas"}`,
              ]
            : []),
          `📍 ${property.neighborhood}`,
          `🏖 ${property.beachDistance}`,
        ].map((item, index, list) => (
          <span
            key={item}
            className="flex items-center gap-2"
          >
            {item}

            {index < list.length - 1 && (
              <span
                aria-hidden="true"
                className="text-zinc-300"
              >
                ·
              </span>
            )}
          </span>
        ))}
      </div>
    </section>
  );
}