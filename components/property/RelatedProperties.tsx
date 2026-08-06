import PropertyCard from "@/components/property/PropertyCard";

import type { Property } from "@/types/Property";

interface RelatedPropertiesProps {
  property: Property;
  properties: Property[];
}

function normalizeText(
  value: string
): string {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .trim()
    .toLowerCase();
}

function calculateSimilarity(
  currentProperty: Property,
  candidateProperty: Property
): number {
  let score = 0;

  const currentNeighborhood =
    normalizeText(
      currentProperty.neighborhood
    );

  const candidateNeighborhood =
    normalizeText(
      candidateProperty.neighborhood
    );

  if (
    currentNeighborhood &&
    currentNeighborhood ===
      candidateNeighborhood
  ) {
    score += 5;
  }

  const guestsDifference = Math.abs(
    currentProperty.guests -
      candidateProperty.guests
  );

  if (guestsDifference === 0) {
    score += 3;
  } else if (
    guestsDifference <= 2
  ) {
    score += 2;
  } else if (
    guestsDifference <= 4
  ) {
    score += 1;
  }

  const bedroomsDifference =
    Math.abs(
      currentProperty.bedrooms -
        candidateProperty.bedrooms
    );

  if (bedroomsDifference === 0) {
    score += 2;
  } else if (
    bedroomsDifference === 1
  ) {
    score += 1;
  }

  if (
    currentProperty.pool ===
    candidateProperty.pool
  ) {
    score += 2;
  }

  if (
    currentProperty.barbecue ===
    candidateProperty.barbecue
  ) {
    score += 1;
  }

  if (
    currentProperty.petFriendly ===
    candidateProperty.petFriendly
  ) {
    score += 1;
  }

  return score;
}

export default function RelatedProperties({
  property,
  properties,
}: RelatedPropertiesProps) {
  const relatedProperties =
    properties
      .filter(
        (candidateProperty) =>
          candidateProperty.id !==
          property.id
      )
      .map(
        (candidateProperty) => ({
          property:
            candidateProperty,

          score:
            calculateSimilarity(
              property,
              candidateProperty
            ),
        })
      )
      .sort(
        (first, second) =>
          second.score -
          first.score
      )
      .slice(0, 3)
      .map(
        (item) => item.property
      );

  if (
    relatedProperties.length === 0
  ) {
    return null;
  }

  return (
    <section className="border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
          Continue explorando
        </p>

        <h2 className="mt-3 text-3xl font-bold text-blue-950 sm:text-4xl">
          Outras casas que você pode gostar
        </h2>

        <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-600">
          Selecionamos outras acomodações
          com características semelhantes
          para ajudar você a encontrar a
          opção ideal em Búzios.
        </p>

        <div className="mt-9 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {relatedProperties.map(
            (relatedProperty) => (
              <PropertyCard
                key={
                  relatedProperty.id
                }
                property={
                  relatedProperty
                }
              />
            )
          )}
        </div>
      </div>
    </section>
  );
}
