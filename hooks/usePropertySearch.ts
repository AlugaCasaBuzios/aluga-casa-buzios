"use client";

import { useMemo, useState } from "react";
import { Property } from "@/types/Property";
import { filterProperties } from "@/lib/search";

export function usePropertySearch(properties: Property[]) {
  const [search, setSearch] = useState("");
  const [guests, setGuests] = useState(0);
  const [pool, setPool] = useState(false);
  const [petFriendly, setPetFriendly] = useState(false);
  const [barbecue, setBarbecue] = useState(false);

  const filteredProperties = useMemo(() => {
    return filterProperties(properties, {
      search,
      guests,
      pool,
      petFriendly,
      barbecue,
    });
  }, [
    properties,
    search,
    guests,
    pool,
    petFriendly,
    barbecue,
  ]);

  return {
    filteredProperties,

    search,
    setSearch,

    guests,
    setGuests,

    pool,
    setPool,

    petFriendly,
    setPetFriendly,

    barbecue,
    setBarbecue,
  };
}