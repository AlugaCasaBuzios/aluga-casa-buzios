"use client";

import { useState } from "react";
import { DateRange } from "react-day-picker";

import type { Property } from "@/types/Property";

import Calendar from "@/components/reservation/Calendar";
import PriceCalculator from "@/components/reservation/PriceCalculator";
import ReservationSummary from "@/components/reservation/ReservationSummary";

export default function PropertyReservation({
  property,
}: {
  property: Property;
}) {
  const [range, setRange] = useState<DateRange>();

  const hasPrice = property.price > 0;

  const formattedPrice = hasPrice
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(property.price)
    : null;

  return (
    <aside className="sticky top-24">
      <div className="rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6">
          {hasPrice ? (
            <>
              <h2 className="text-4xl font-bold text-sky-700">
                {formattedPrice}
              </h2>

              <p className="text-zinc-500">
                por noite
              </p>
            </>
          ) : (
            <div className="rounded-2xl bg-sky-50 p-5">
              <p className="text-sm font-bold uppercase tracking-wider text-sky-700">
                Valor da hospedagem
              </p>

              <h2 className="mt-2 text-3xl font-bold text-blue-950">
                Sob consulta
              </h2>

              <p className="mt-2 leading-6 text-zinc-600">
                Escolha as datas e consulte o valor
                diretamente pelo WhatsApp.
              </p>
            </div>
          )}
        </div>

        <Calendar
          selected={range}
          onSelect={setRange}
        />

        {hasPrice && (
          <div className="mt-8">
            <PriceCalculator
              price={property.price}
              cleaningFee={property.cleaningFee}
              checkIn={range?.from}
              checkOut={range?.to}
            />
          </div>
        )}

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