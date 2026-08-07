export type PropertyPublicationChecklistInput = {
  title: string;
  neighborhood: string;
  description: string;
  image: string;
  gallery: string[] | null;
  guests: number | string;
  bedrooms: number | string;
  bathrooms: number | string;
  beds: number | string;
  amenities: string[] | null;
  whatsapp: string;
  latitude: number | string | null;
  longitude: number | string | null;
  basePrice: number | string | null;
  minimumNights: number | string | null;
};

export type PropertyPublicationChecklistItem = {
  id: string;
  label: string;
  description: string;
  complete: boolean;
  section: "dados" | "fotos" | "precos";
};

export type PropertyPublicationChecklist = {
  items: PropertyPublicationChecklistItem[];
  completeCount: number;
  totalCount: number;
  ready: boolean;
};

function toFiniteNumber(
  value: number | string | null
): number | null {
  if (
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function hasText(
  value: string,
  minimumLength = 1
): boolean {
  return (
    value.trim().length >=
    minimumLength
  );
}

function hasValidCoordinates(
  latitude: number | string | null,
  longitude: number | string | null
): boolean {
  const parsedLatitude =
    toFiniteNumber(latitude);

  const parsedLongitude =
    toFiniteNumber(longitude);

  return (
    parsedLatitude !== null &&
    parsedLongitude !== null &&
    parsedLatitude >= -90 &&
    parsedLatitude <= 90 &&
    parsedLongitude >= -180 &&
    parsedLongitude <= 180
  );
}

export function getPropertyPublicationChecklist(
  input: PropertyPublicationChecklistInput
): PropertyPublicationChecklist {
  const uniquePhotos = Array.from(
    new Set(
      [
        input.image,
        ...(input.gallery ?? []),
      ]
        .map((photo) => photo.trim())
        .filter(Boolean)
    )
  );

  const guests =
    toFiniteNumber(input.guests);

  const bedrooms =
    toFiniteNumber(input.bedrooms);

  const bathrooms =
    toFiniteNumber(input.bathrooms);

  const beds =
    toFiniteNumber(input.beds);

  const basePrice =
    toFiniteNumber(input.basePrice);

  const minimumNights =
    toFiniteNumber(
      input.minimumNights
    );

  const amenities = Array.from(
    new Set(
      (input.amenities ?? [])
        .map((amenity) =>
          amenity.trim()
        )
        .filter(Boolean)
    )
  );

  const items: PropertyPublicationChecklistItem[] = [
    {
      id: "identificacao",
      label: "Identificação",
      description:
        "Título e bairro preenchidos.",
      complete:
        hasText(input.title, 3) &&
        hasText(
          input.neighborhood,
          2
        ),
      section: "dados",
    },
    {
      id: "descricao",
      label: "Descrição",
      description:
        "Descrição pública com pelo menos 40 caracteres.",
      complete: hasText(
        input.description,
        40
      ),
      section: "dados",
    },
    {
      id: "fotos",
      label: "Fotos",
      description:
        "Foto principal e pelo menos 3 fotos na galeria.",
      complete:
        hasText(input.image) &&
        uniquePhotos.length >= 3,
      section: "fotos",
    },
    {
      id: "estrutura",
      label: "Capacidade e estrutura",
      description:
        "Hóspedes, quartos, banheiros e camas informados.",
      complete:
        guests !== null &&
        guests >= 1 &&
        bedrooms !== null &&
        bedrooms >= 1 &&
        bathrooms !== null &&
        bathrooms >= 1 &&
        beds !== null &&
        beds >= 1,
      section: "dados",
    },
    {
      id: "comodidades",
      label: "Comodidades",
      description:
        "Pelo menos 3 comodidades cadastradas.",
      complete:
        amenities.length >= 3,
      section: "dados",
    },
    {
      id: "contato",
      label: "Contato",
      description:
        "WhatsApp do atendimento preenchido.",
      complete: hasText(
        input.whatsapp,
        8
      ),
      section: "dados",
    },
    {
      id: "localizacao",
      label: "Localização",
      description:
        "Latitude e longitude válidas.",
      complete:
        hasValidCoordinates(
          input.latitude,
          input.longitude
        ),
      section: "dados",
    },
    {
      id: "precos",
      label: "Preço e estadia mínima",
      description:
        "Preço-base maior que zero e mínimo de noites definido.",
      complete:
        basePrice !== null &&
        basePrice > 0 &&
        minimumNights !== null &&
        Number.isInteger(
          minimumNights
        ) &&
        minimumNights >= 1,
      section: "precos",
    },
  ];

  const completeCount =
    items.filter(
      (item) => item.complete
    ).length;

  return {
    items,
    completeCount,
    totalCount: items.length,
    ready:
      completeCount ===
      items.length,
  };
}
