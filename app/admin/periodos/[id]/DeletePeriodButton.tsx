"use client";

import {
  useState,
} from "react";

import {
  deleteSpecialPricingRule,
} from "./actions";

type DeletePeriodButtonProps = {
  id: string;
  name: string;
};

export function DeletePeriodButton({
  id,
  name,
}: DeletePeriodButtonProps) {
  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    const confirmed = window.confirm(
      `Tem certeza de que deseja excluir o período "${name}"?\n\nEssa ação não poderá ser desfeita.`
    );

    if (!confirmed) {
      event.preventDefault();
      return;
    }

    setIsDeleting(true);
  }

  return (
    <form
      action={deleteSpecialPricingRule}
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
          : "Excluir período"}
      </button>
    </form>
  );
}