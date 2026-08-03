import Image from "next/image";

import SearchBar from "@/components/home/SearchBar";

interface HeroProps {
  search: string;
  setSearch: (value: string) => void;
}

export default function Hero({
  search,
  setSearch,
}: HeroProps) {
  return (
    <section className="relative min-h-[720px] overflow-hidden">
      <Image
        src="/images/hero/Hero-otimizada.jpg"
        alt="Vista aérea de Armação dos Búzios"
        fill
        sizes="100vw"
        fetchPriority="high"
        className="object-cover"
      />

      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10 mx-auto flex min-h-[720px] max-w-7xl flex-col items-center justify-center px-6 py-20 text-center text-white">
        <p className="mb-5 text-sm font-bold uppercase tracking-[0.35em] text-white/80">
          Casas de temporada em Búzios
        </p>

        <h1 className="max-w-5xl text-4xl font-black leading-[1.08] sm:text-5xl lg:text-7xl">
          Viva momentos inesquecíveis nas melhores propriedades de temporada
          em Armação dos Búzios.
        </h1>

        <p className="mt-7 max-w-3xl text-lg leading-8 text-white/90 sm:text-xl">
          Encontre casas próximas às praias mais bonitas, com conforto,
          privacidade e atendimento direto.
        </p>

        <a
          href="#imoveis"
          className="mt-8 rounded-full bg-sky-700 px-8 py-4 text-base font-bold text-white shadow-xl transition hover:-translate-y-1 hover:bg-sky-800"
        >
          Ver casas disponíveis
        </a>

        <div className="mt-10 w-full max-w-5xl">
          <SearchBar
            search={search}
            setSearch={setSearch}
          />
        </div>
      </div>
    </section>
  );
}