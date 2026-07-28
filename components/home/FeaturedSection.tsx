import PropertyCard from "@/components/property/PropertyCard";
import { properties } from "@/app/data/properties";

export default function FeaturedSection() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-20">

      <div className="flex items-center justify-between mb-10">

        <div>

          <h2 className="text-4xl font-bold text-blue-950">
            Casas em Destaque
          </h2>

          <p className="text-gray-500 mt-2">
            As melhores opções para sua temporada em Búzios.
          </p>

        </div>

      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">

        {properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
          />
        ))}

      </div>

    </section>
  );
}