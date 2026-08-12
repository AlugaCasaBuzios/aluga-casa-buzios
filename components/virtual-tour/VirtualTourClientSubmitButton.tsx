"use client";

import { useFormStatus } from "react-dom";

export default function VirtualTourClientSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      style={{ color: "#ffffff" }}
      className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-blue-950 px-6 py-4 text-lg font-black text-white shadow-lg transition hover:bg-blue-900 disabled:cursor-wait disabled:bg-slate-500"
    >
      {pending ? "Cadastrando cliente..." : "Cadastrar cliente"}
    </button>
  );
}
