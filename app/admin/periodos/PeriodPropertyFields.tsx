import type { PricingPropertyOption } from "@/lib/pricing/getPricingPropertyOptions";

type PeriodPropertyFieldsProps = {
  properties: PricingPropertyOption[];
  defaultPropertyId?: string | null;
  defaultNightlyPrice?: number | string | null;
};

const fieldClassName =
  "w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100";

/**
 * Campos de imóvel e preço fixo, comuns
 * ao cadastro e à edição de períodos.
 */
export default function PeriodPropertyFields({
  properties,
  defaultPropertyId,
  defaultNightlyPrice,
}: PeriodPropertyFieldsProps) {
  return (
    <>
      <div>
        <label
          htmlFor="propertyId"
          className="mb-2 block text-sm font-bold text-slate-800"
        >
          Imóvel
        </label>

        <select
          id="propertyId"
          name="propertyId"
          defaultValue={defaultPropertyId ?? ""}
          className={fieldClassName}
        >
          <option value="">
            Todos os imóveis
          </option>

          {properties.map((property) => (
            <option
              key={property.id}
              value={property.id}
            >
              {property.name}
            </option>
          ))}
        </select>

        <p className="mt-2 text-xs text-slate-500">
          Um período exclusivo vence um período geral
          de mesma prioridade.
        </p>
      </div>

      <div>
        <label
          htmlFor="nightlyPrice"
          className="mb-2 block text-sm font-bold text-slate-800"
        >
          Preço fixo por noite (opcional)
        </label>

        <input
          id="nightlyPrice"
          name="nightlyPrice"
          type="number"
          min="0.01"
          step="0.01"
          defaultValue={defaultNightlyPrice ?? ""}
          placeholder="Exemplo: 2500"
          className={fieldClassName}
        />

        <p className="mt-2 text-xs text-slate-500">
          Valor do Airbnb para estas datas. Quando
          preenchido, substitui o multiplicador.
        </p>
      </div>
    </>
  );
}
