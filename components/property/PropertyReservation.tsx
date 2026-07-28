"use client";

import { useState } from "react";

import { DateRange } from "react-day-picker";

import { Property } from "@/types/Property";

import Calendar from "@/components/reservation/Calendar";
import PriceCalculator from "@/components/reservation/PriceCalculator";
import ReservationSummary from "@/components/reservation/ReservationSummary";

export default function PropertyReservation({
  property,
}: {
  property: Property;
}) {
  const [range, setRange] = useState<DateRange>();

  return (
    <aside className="sticky top-24">

      <div className="rounded-3xl bg-white p-8 shadow-2xl">

        <div className="mb-6">

          <h2 className="text-4xl font-bold text-sky-700">
            R$ {property.price}
          </h2>

          <p className="text-zinc-500">
            por noite
          </p>

        </div>

        <Calendar
          selected={range}
          onSelect={setRange}
        />

        <div className="mt-8">

          <PriceCalculator
            price={property.price}
            cleaningFee={property.cleaningFee}
            checkIn={range?.from}
            checkOut={range?.to}
          />

        </div>

        <div className="mt-8">

          <ReservationSummary
            propertyName={property.title}
            whatsapp={property.whatsapp}
            guests={property.guests}
            checkIn={range?.from}
            checkOut={range?.to}
          />

        </div>

      </div>

    </aside>
  );
}