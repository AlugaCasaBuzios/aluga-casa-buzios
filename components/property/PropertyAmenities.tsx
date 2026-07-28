interface PropertyAmenitiesProps {
  amenities: string[];
}

export default function PropertyAmenities({
  amenities,
}: PropertyAmenitiesProps) {
  return (
    <section className="mt-12">

      <h2 className="mb-6 text-3xl font-bold">

        Comodidades

      </h2>

      <div className="grid gap-3 md:grid-cols-2">

        {amenities.map((item) => (

          <div
            key={item}
            className="rounded-xl border p-4"
          >
            ✅ {item}
          </div>

        ))}

      </div>

    </section>
  );
}