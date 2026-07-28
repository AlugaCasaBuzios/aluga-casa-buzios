"use client";

import { differenceInDays } from "date-fns";

interface Props {
  price: number;
  cleaningFee: number;
  checkIn?: Date;
  checkOut?: Date;
}

export default function PriceCalculator({
  price,
  cleaningFee,
  checkIn,
  checkOut,
}: Props) {
  if (!checkIn || !checkOut) {
    return (
      <div className="rounded-2xl bg-slate-50 p-5">
        <p className="text-zinc-500">
          Selecione as datas para calcular o valor da hospedagem.
        </p>
      </div>
    );
  }

  const nights = Math.max(
    differenceInDays(checkOut, checkIn),
    1
  );

  const total = nights * price + cleaningFee;

  return (
    <div className="rounded-2xl bg-slate-50 p-5">

      <div className="flex justify-between">

        <span>
          R$ {price} × {nights} noite{nights > 1 ? "s" : ""}
        </span>

        <strong>
          R$ {(price * nights).toLocaleString("pt-BR")}
        </strong>

      </div>

      <div className="mt-3 flex justify-between">

        <span>Taxa de limpeza</span>

        <strong>
          R$ {cleaningFee.toLocaleString("pt-BR")}
        </strong>

      </div>

      <hr className="my-5" />

      <div className="flex justify-between text-xl font-bold">

        <span>Total</span>

        <span>
          R$ {total.toLocaleString("pt-BR")}
        </span>

      </div>

    </div>
  );
}