import { Property } from "@/types/Property";

interface SearchFilters {
  search?: string;
  guests?: number;
  pool?: boolean;
  petFriendly?: boolean;
  barbecue?: boolean;
}

export function filterProperties(
  properties: Property[],
  filters: SearchFilters
): Property[] {
  const searchTerm =
    typeof filters.search === "string"
      ? filters.search.trim().toLowerCase()
      : "";

  return properties.filter((property) => {
    const matchesSearch =
      !searchTerm ||
      property.title.toLowerCase().includes(searchTerm) ||
      property.neighborhood.toLowerCase().includes(searchTerm) ||
      property.description.toLowerCase().includes(searchTerm) ||
      property.keywords.some((keyword) =>
        keyword.toLowerCase().includes(searchTerm)
      );

    const matchesGuests =
      !filters.guests ||
      property.guests >= filters.guests;

    const matchesPool =
      !filters.pool ||
      property.pool;

    const matchesPetFriendly =
      !filters.petFriendly ||
      property.petFriendly;

    const matchesBarbecue =
      !filters.barbecue ||
      property.barbecue;

    return (
      matchesSearch &&
      matchesGuests &&
      matchesPool &&
      matchesPetFriendly &&
      matchesBarbecue
    );
  });
}