"use client";

import { useState } from "react";

interface PropertyAmenitiesProps {
  amenities: string[];
}

const VISIBLE_LIMIT = 8;

export default function PropertyAmenities({
  amenities,
}: PropertyAmenitiesProps) {
  const [expanded, setExpanded] =
    useState(false);

  const hasMore =
    amenities.length > VISIBLE_LIMIT;

  const visibleAmenities = expanded
    ? amenities
    : amenities.slice(
        0,
        VISIBLE_LIMIT
      );

  return (
    <section>
      <h2 className="mb-4 text-3xl font-bold text-blue-950">
        Comodidades
      </h2>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
        {visibleAmenities.map(
          (item) => (
            <div
              key={item}
              className="flex items-start gap-2 text-sm text-zinc-700"
            >
              <span aria-hidden="true">
                ✅
              </span>

              {item}
            </div>
          )
        )}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() =>
            setExpanded(
              (current) => !current
            )
          }
          className="mt-4 font-bold text-sky-700 transition hover:text-sky-900"
        >
          {expanded
            ? "Ver menos comodidades"
            : `Ver todas as comodidades (${amenities.length})`}
        </button>
      )}
    </section>
  );
}
