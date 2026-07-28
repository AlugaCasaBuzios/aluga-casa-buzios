import { Property } from "@/types/Property";

interface Props {
  property: Property;
}

export default function PropertySummary({ property }: Props) {
  return (
    <section className="rounded-3xl bg-white p-8 shadow-lg">

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-4xl font-bold text-blue-950">
            {property.title}
          </h1>

          <p className="mt-2 text-lg text-gray-500">
            📍 {property.address}
          </p>

        </div>

        <div className="rounded-2xl bg-yellow-50 px-6 py-4 text-center">

          <div className="text-3xl font-bold text-yellow-600">
            ⭐ {property.rating}
          </div>

          <p className="text-sm text-gray-500">
            {property.reviews} avaliações
          </p>

        </div>

      </div>

      <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">

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

        <Info
          icon="📐"
          title="Área"
          value={`${property.area} m²`}
        />

        <Info
          icon="🚗"
          title="Garagem"
          value={property.garage}
        />

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

function Info({ icon, title, value }: InfoProps) {
  return (
    <div className="rounded-2xl border p-5 text-center transition hover:border-blue-700">

      <div className="text-3xl">
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