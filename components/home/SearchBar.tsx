"use client";

import { FormEvent } from "react";

interface SearchBarProps {
  search: string;
  setSearch: (value: string) => void;
}

export default function SearchBar({
  search,
  setSearch,
}: SearchBarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    document.getElementById("imoveis")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-3xl bg-white p-4 shadow-2xl sm:p-6"
    >
      <div className="grid gap-4 md:grid-cols-[1fr_240px]">
        <label className="sr-only" htmlFor="property-search">
          Buscar imóvel
        </label>

        <input
          id="property-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Digite o nome da casa, bairro ou palavra-chave..."
          className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-base text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-sky-700 focus:ring-4 focus:ring-sky-100 sm:text-lg"
        />

        <button
          type="submit"
          className="rounded-2xl bg-sky-700 px-8 py-4 text-base font-bold text-white shadow-md transition hover:bg-sky-800 sm:text-lg"
        >
          🔍 Pesquisar
        </button>
      </div>
    </form>
  );
}