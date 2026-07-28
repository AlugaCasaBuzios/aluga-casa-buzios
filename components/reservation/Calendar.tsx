"use client";

import "react-day-picker/dist/style.css";

import { DayPicker, DateRange } from "react-day-picker";
import { ptBR } from "date-fns/locale";

interface Props {
  selected: DateRange | undefined;
  onSelect: (range: DateRange | undefined) => void;
}

export default function Calendar({
  selected,
  onSelect,
}: Props) {
  return (
    <div className="rounded-3xl border bg-white p-5">

      <h3 className="mb-5 text-xl font-bold text-blue-950">
        Selecione o período da hospedagem
      </h3>

      <DayPicker
        mode="range"
        locale={ptBR}
        selected={selected}
        onSelect={onSelect}
        numberOfMonths={2}
        showOutsideDays
        pagedNavigation
      />

    </div>
  );
}