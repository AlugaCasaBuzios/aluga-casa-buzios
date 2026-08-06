import type { Property } from "@/types/Property";

const featuredPropertyIds = [
  "casa-em-buzios",
  "casa-da-margarida",
  "conforto",
];

type TestimonialsProps = {
  properties: Property[];
};

export default function Testimonials({
  properties,
}: TestimonialsProps) {
  const reviewedProperties =
    properties
      .filter((property) =>
        featuredPropertyIds.includes(
          property.id
        )
      )
      .filter(
        (property) =>
          property.rating > 0 &&
          property.reviews > 0 &&
          property.airbnb.trim() !== ""
      )
      .sort(
        (
          firstProperty,
          secondProperty
        ) =>
          featuredPropertyIds.indexOf(
            firstProperty.id
          ) -
          featuredPropertyIds.indexOf(
            secondProperty.id
          )
      );

  if (
    reviewedProperties.length === 0
  ) {
    return null;
  }

  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
            Confiança comprovada
          </p>

          <h2 className="mt-3 text-4xl font-bold text-blue-950">
            Avaliações verificadas no Airbnb
          </h2>

          <p className="mt-4 text-lg text-gray-600">
            Confira as notas reais de hóspedes que
            reservaram e avaliaram nossas acomodações
            no Airbnb.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {reviewedProperties.map(
            (property) => {
              const formattedRating =
                property.rating.toLocaleString(
                  "pt-BR",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                );

              return (
                <article
                  key={property.id}
                  className="flex h-full flex-col rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-2xl text-yellow-500">
                      ★★★★★
                    </div>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                      Airbnb
                    </span>
                  </div>

                  <div className="mt-7">
                    <p className="text-5xl font-bold text-blue-950">
                      {formattedRating}
                    </p>

                    <p className="mt-2 text-gray-600">
                      Baseado em{" "}
                      <strong className="text-slate-900">
                        {
                          property.reviews
                        }
                      </strong>{" "}
                      {property.reviews === 1
                        ? "avaliação"
                        : "avaliações"}
                    </p>
                  </div>

                  <h3 className="mt-7 text-xl font-bold text-blue-950">
                    {property.title}
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    Avaliações publicadas por hóspedes
                    no anúncio oficial da acomodação.
                  </p>

                  <div className="mt-auto pt-8">
                    <a
                      href={
                        property.airbnb
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-center font-bold text-white transition hover:bg-blue-900"
                      style={{
                        color: "#ffffff",
                      }}
                    >
                      Ver avaliações no Airbnb
                    </a>
                  </div>
                </article>
              );
            }
          )}
        </div>

        <div className="mt-12 text-center">
          <a
            href="https://www.airbnb.com.br/p/alugacasabuzios"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-blue-950 px-6 py-3 font-bold text-blue-950 transition hover:bg-blue-50"
          >
            Ver perfil da Aluga Casa Búzios no Airbnb
          </a>
        </div>
      </div>
    </section>
  );
}
