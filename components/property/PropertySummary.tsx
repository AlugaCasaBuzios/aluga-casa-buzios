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

      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        <Info
          icon="👥"
          title="Hóspedes"
          value={property.guests}
        />

        <Info
          icon="🛏"
          title="Quartos"
          value={property.bedrooms}
        />

        <Info
          icon="🚿"
          title="Banheiros"
          value={property.bathrooms}
        />

        <Info
          icon="🛌"
          title="Camas"
          value={property.beds}
        />

        {hasArea && (
          <Info
            icon="📐"
            title="Área"
            value={`${property.area} m²`}
          />
        )}

        {hasGarage && (
          <Info
            icon="🚗"
            title="Garagem"
            value={property.garage}
          />
        )}

        <Info
          icon="📍"
          title="Bairro"
          value={property.neighborhood}
        />

        <Info
          icon="🏖"
          title="Praia"
          value={property.beachDistance}
        />
      </div>
    </section>
  );
}

interface InfoProps {
  icon: string;
  title: string;
  value: string | number;
}

function Info({
  icon,
  title,
  value,
}: InfoProps) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 text-center transition hover:border-blue-700 md:p-5">
      <div
        aria-hidden="true"
        className="text-3xl"
      >
        {icon}
      </div>

      <div className="mt-3 text-sm text-gray-500">
        {title}
      </div>

      <div className="mt-1 font-bold text-blue-950">
        {value}
      </div>
    </div>
  );
}