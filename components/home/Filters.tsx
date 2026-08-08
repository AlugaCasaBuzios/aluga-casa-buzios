"use client";

interface FiltersProps {
  guests: number;
  setGuests: (value: number) => void;

  neighborhood: string;
  setNeighborhood: (value: string) => void;
  neighborhoods: string[];

  pool: boolean;
  setPool: (value: boolean) => void;

  petFriendly: boolean;
  setPetFriendly: (value: boolean) => void;

  barbecue: boolean;
  setBarbecue: (value: boolean) => void;
}

export default function Filters({
  guests,
  setGuests,
  neighborhood,
  setNeighborhood,
  neighborhoods,
  pool,
  setPool,
  petFriendly,
  setPetFriendly,
  barbecue,
  setBarbecue,
}: FiltersProps) {
  return (
    <section className="bg-white border-b">

      <div className="mx-auto max-w-7xl px-6 py-6">

        <div className="flex flex-wrap items-center gap-6">

          <label htmlFor="guests-filter" className="sr-only">
  Filtrar imóveis pela quantidade de hóspedes
</label>

<select
  id="guests-filter"
  aria-label="Filtrar imóveis pela quantidade de hóspedes"
  value={guests}
  onChange={(e) => setGuests(Number(e.target.value))}
  className="rounded-xl border px-4 py-3"
>
  <option value={0}>Qualquer quantidade</option>
  <option value={2}>2 hóspedes</option>
  <option value={4}>4 hóspedes</option>
  <option value={6}>6 hóspedes</option>
  <option value={8}>8 hóspedes</option>
  <option value={10}>10 hóspedes</option>
  <option value={12}>12 hóspedes</option>
</select>

          <label htmlFor="neighborhood-filter" className="sr-only">
            Filtrar imóveis por bairro
          </label>

          <select
            id="neighborhood-filter"
            aria-label="Filtrar imóveis por bairro"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            className="rounded-xl border px-4 py-3"
          >
            <option value="">Todos os bairros</option>

            {neighborhoods.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 cursor-pointer">

            <input
              type="checkbox"
              checked={pool}
              onChange={(e) => setPool(e.target.checked)}
            />

            🏊 Piscina

          </label>

          <label className="flex items-center gap-2 cursor-pointer">

            <input
              type="checkbox"
              checked={petFriendly}
              onChange={(e) => setPetFriendly(e.target.checked)}
            />

            🐶 Pet Friendly

          </label>

          <label className="flex items-center gap-2 cursor-pointer">

            <input
              type="checkbox"
              checked={barbecue}
              onChange={(e) => setBarbecue(e.target.checked)}
            />

            🍖 Churrasqueira

          </label>

        </div>

      </div>

    </section>
  );
}