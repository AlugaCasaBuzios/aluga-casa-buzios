import type { Property } from "@/types/Property";

interface PropertyMapProps {
  property: Property;
}

export default function PropertyMap({
  property,
}: PropertyMapProps) {
  const location =
    property.latitude !== undefined &&
    property.longitude !== undefined
      ? `${property.latitude},${property.longitude}`
      : property.address || property.neighborhood;

  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    location
  )}&z=15&output=embed`;

  return (
    <section className="mt-16">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
          Localização
        </p>

        <h2 className="mt-3 text-3xl font-bold text-blue-950">
          Onde você ficará
        </h2>

        <p className="mt-3 text-zinc-600">
          📍 {property.address || property.neighborhood}
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-lg">
        <iframe
          src={mapUrl}
          title={`Mapa da localização do imóvel ${property.title}`}
          width="100%"
          height="450"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="block w-full border-0"
        />
      </div>

      <p className="mt-4 text-sm leading-6 text-zinc-500">
        A localização exibida pode ser aproximada. O endereço completo é
        informado após a confirmação da reserva.
      </p>
    </section>
  );
}