"use client";

import {
  useState,
  type FormEvent,
} from "react";

import {
  deleteDatePricingOverride,
} from "./actions";

type DeleteDatePricingButtonProps = {
  id: string;
  propertyName: string;
  pricingDate: string;
};

function formatDate(
  date: string
): string {
  const [year, month, day] =
    date.split("-");

  return `${day}/${month}/${year}`;
}

export function DeleteDatePricingButton({
  id,
  propertyName,
  pricingDate,
}: DeleteDatePricingButtonProps) {
  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    const confirmed =
      window.confirm(
        `Tem certeza de que deseja excluir o preço de ${propertyName} para ${formatDate(
          pricingDate
        )}?\n\nEssa ação não poderá ser desfeita.`
      );

    if (!confirmed) {
      event.preventDefault();
      return;
    }

    setIsDeleting(true);
  }

  return (
    <form
      action={deleteDatePricingOverride}
      onSubmit={handleSubmit}
    >
      <input
        type="hidden"
        name="id"
        value={id}
      />

      <button
        type="submit"
        disabled={isDeleting}
        className="w-full rounded-xl border border-red-300 bg-red-50 px-6 py-3 font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isDeleting
          ? "Excluindo..."
          : "Excluir preço por data"}
      </button>
    </form>
  );
}