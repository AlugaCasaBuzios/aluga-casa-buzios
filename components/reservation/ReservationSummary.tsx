"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  propertyName: string;
  whatsapp: string;
  checkIn?: Date;
  checkOut?: Date;
  guests: number;
}

export default function ReservationSummary({
  propertyName,
  whatsapp,
  checkIn,
  checkOut,
  guests,
}: Props) {
  const message = `Olá!

Gostaria de reservar o imóvel:

${propertyName}

Check-in:
${checkIn ? format(checkIn, "dd/MM/yyyy", { locale: ptBR }) : "-"}

Check-out:
${checkOut ? format(checkOut, "dd/MM/yyyy", { locale: ptBR }) : "-"}

Hóspedes:
${guests}`;

  return (
    <a
      href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full justify-center rounded-2xl bg-green-600 py-4 text-lg font-bold text-white transition hover:bg-green-700"
    >
      📲 Reservar pelo WhatsApp
    </a>
  );
}