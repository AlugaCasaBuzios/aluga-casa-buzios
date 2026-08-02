"use client";

import {
  useState,
  type FormEvent,
} from "react";

import {
  deleteManualAvailabilityBlock,
} from "./actions";

type DeleteManualBlockButtonProps = {
  id: string;
  propertyName: string;
  startDate: string;
  endDateExclusive: string;
};

function formatDate(
  date: string
): string {
  const [year, month, day] =
    date.split("-");

  return `${day}/${month}/${year}`;
}

export function DeleteManualBlockButton({
  id,
  propertyName,
  startDate,
  endDateExclusive,
}: DeleteManualBlockButtonProps) {
  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    const confirmed =
      window.confirm(
        `Tem certeza de que deseja excluir o bloqueio de ${propertyName}, entre ${formatDate(
          startDate
        )} e ${formatDate(
          endDateExclusive
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
      action={deleteManualAvailabilityBlock}
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
          : "Excluir bloqueio"}
      </button>
    </form>
  );
}