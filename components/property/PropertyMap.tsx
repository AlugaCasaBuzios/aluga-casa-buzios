import type { Property } from "@/types/Property";

interface PropertyMapProps {
  property: Property;
}

export default function PropertyMap({
  property,
}: PropertyMapProps) {
  const hasCoordinates =
    property.latitude !== undefined &&
    property.longitude !== undefined;

  const location = hasCoordinates
    ? `${property.latitude},${property.longitude}`
    : property.address ||
      property.neighborhood;

  const encodedLocation =
    encodeURIComponent(location);

  const mapEmbedUrl =
    `https://www.google.com/maps?q=${encodedLocation}&z=15&output=embed`;

  const googleMapsUrl =
    `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;

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
          📍{" "}
          {property.address ||
            property.neighborhood}
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-lg">
        <iframe
          src={mapEmbedUrl}
          title={`Mapa da localização aproximada do imóvel ${property.title}`}
          width="100%"
          height="450"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="block w-full border-0"
        />
      </div>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-zinc-500">
          A localização exibida é aproximada.
          O endereço completo e o número do
          imóvel são informados após a
          confirmação da reserva.
        </p>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-analytics-event="map_click"
          data-property-id={property.id}
          data-property-title={
            property.title
          }
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-blue-950 px-6 py-3 text-center font-bold shadow-md transition hover:-translate-y-0.5 hover:bg-blue-900"
          style={{
            color: "#ffffff",
          }}
          aria-label={`Abrir a localização aproximada de ${property.title} no Google Maps`}
        >
          Abrir no Google Maps ↗
        </a>
      </div>
    </section>
  );
}