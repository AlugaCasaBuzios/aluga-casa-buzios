"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import {
  setPropertyActive,
} from "@/app/admin/imoveis/catalog-actions";

import PropertyDeleteButton from "@/components/admin/PropertyDeleteButton";

export type AdminPropertyListItem = {
  property_id: string;
  property_name: string;
  neighborhood: string;
  base_price: number;
  cleaning_fee: number | null;
  minimum_nights: number | null;
  minimum_price: number | null;
  maximum_price: number | null;
  active: boolean;
  publicationReady: boolean;
  publicationProgress: number;
};

type AdminPropertyTableProps = {
  properties: AdminPropertyListItem[];
};

type PropertyFilter =
  | "all"
  | "active"
  | "inactive"
  | "ready"
  | "pending";

function formatCurrency(
  value: number | null
): string {
  if (value === null) {
    return "Não definido";
  }

  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(value);
}

function normalizeSearch(
  value: string
): string {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export default function AdminPropertyTable({
  properties,
}: AdminPropertyTableProps) {
  const [query, setQuery] =
    useState("");

  const [filter, setFilter] =
    useState<PropertyFilter>("all");

  const normalizedQuery =
    normalizeSearch(query);

  const counts = useMemo(
    () => ({
      all: properties.length,
      active: properties.filter(
        (property) =>
          property.active
      ).length,
      inactive: properties.filter(
        (property) =>
          !property.active
      ).length,
      ready: properties.filter(
        (property) =>
          property.publicationReady
      ).length,
      pending: properties.filter(
        (property) =>
          !property.publicationReady
      ).length,
    }),
    [properties]
  );

  const filteredProperties =
    useMemo(() => {
      return properties.filter(
        (property) => {
          const matchesQuery =
            !normalizedQuery ||
            normalizeSearch(
              [
                property.property_name,
                property.property_id,
                property.neighborhood,
              ].join(" ")
            ).includes(
              normalizedQuery
            );

          if (!matchesQuery) {
            return false;
          }

          switch (filter) {
            case "active":
              return property.active;

            case "inactive":
              return !property.active;

            case "ready":
              return property.publicationReady;

            case "pending":
              return !property.publicationReady;

            default:
              return true;
          }
        }
      );
    }, [
      filter,
      normalizedQuery,
      properties,
    ]);

  function clearFilters() {
    setQuery("");
    setFilter("all");
  }

  const hasFilters =
    filter !== "all" ||
    normalizedQuery.length > 0;

  const filterButtons: {
    id: PropertyFilter;
    label: string;
    count: number;
  }[] = [
    {
      id: "all",
      label: "Todos",
      count: counts.all,
    },
    {
      id: "active",
      label: "Ativos",
      count: counts.active,
    },
    {
      id: "inactive",
      label: "Inativos",
      count: counts.inactive,
    },
    {
      id: "ready",
      label: "Prontos para publicar",
      count: counts.ready,
    },
    {
      id: "pending",
      label: "Com pendências",
      count: counts.pending,
    },
  ];

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-lg">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Imóveis cadastrados
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              {properties.length}{" "}
              {properties.length === 1
                ? "imóvel cadastrado"
                : "imóveis cadastrados"}
            </p>
          </div>

          <Link
            href="/admin/imoveis/novo"
            style={{
              color: "#ffffff",
            }}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-green-700 px-5 py-3 font-bold text-white transition hover:bg-green-800"
          >
            + Adicionar casa
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label
            htmlFor="property-search"
            className="block text-sm font-bold text-slate-800"
          >
            Buscar imóvel
          </label>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="property-search"
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value
                )
              }
              placeholder="Nome, bairro ou identificador"
              autoComplete="off"
              className="min-h-12 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-800 focus:ring-4 focus:ring-blue-100"
            />

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div
            aria-label="Filtros dos imóveis"
            className="mt-4 flex flex-wrap gap-2"
          >
            {filterButtons.map(
              (button) => {
                const selected =
                  filter === button.id;

                return (
                  <button
                    key={button.id}
                    type="button"
                    onClick={() =>
                      setFilter(
                        button.id
                      )
                    }
                    aria-pressed={
                      selected
                    }
                    className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${
                      selected
                        ? "border-blue-950 bg-blue-950 !text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <span>
                      {button.label}
                    </span>

                    <span
                      className={`inline-flex min-w-6 justify-center rounded-full px-2 py-0.5 text-xs ${
                        selected
                          ? "bg-white/20 !text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {button.count}
                    </span>
                  </button>
                );
              }
            )}
          </div>

          <p
            aria-live="polite"
            className="mt-4 text-sm font-semibold text-slate-600"
          >
            Exibindo{" "}
            {filteredProperties.length} de{" "}
            {properties.length}{" "}
            {properties.length === 1
              ? "imóvel"
              : "imóveis"}.
          </p>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <h3 className="text-lg font-bold text-slate-900">
            Nenhum imóvel encontrado
          </h3>

          <p className="mt-2 text-slate-600">
            Não existem imóveis cadastrados na
            tabela property_pricing.
          </p>
        </div>
      ) : filteredProperties.length ===
        0 ? (
        <div className="px-6 py-12 text-center">
          <h3 className="text-lg font-bold text-slate-900">
            Nenhum imóvel corresponde aos filtros
          </h3>

          <p className="mt-2 text-slate-600">
            Tente outro nome, bairro ou status.
          </p>

          <button
            type="button"
            onClick={clearFilters}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 font-bold !text-white transition hover:bg-blue-900"
          >
            Mostrar todos
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] text-left">
            <thead className="bg-slate-50 text-sm text-slate-700">
              <tr>
                <th scope="col" className="px-5 py-4">
                  Imóvel
                </th>

                <th scope="col" className="px-5 py-4">
                  Publicação
                </th>

                <th scope="col" className="px-5 py-4">
                  Preço-base
                </th>

                <th scope="col" className="px-5 py-4">
                  Limpeza
                </th>

                <th scope="col" className="px-5 py-4">
                  Mínimo de noites
                </th>

                <th scope="col" className="px-5 py-4">
                  Preço mínimo
                </th>

                <th scope="col" className="px-5 py-4">
                  Preço máximo
                </th>

                <th scope="col" className="px-5 py-4">
                  Status
                </th>

                <th scope="col" className="px-5 py-4">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredProperties.map(
                (property) => (
                  <tr
                    key={
                      property.property_id
                    }
                    className="text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {
                          property.property_name
                        }
                      </p>

                      {property.neighborhood && (
                        <p className="mt-1 text-xs font-medium text-slate-600">
                          {
                            property.neighborhood
                          }
                        </p>
                      )}

                      <p className="mt-1 text-xs text-slate-500">
                        {
                          property.property_id
                        }
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="min-w-36">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            property.publicationReady
                              ? "bg-green-100 text-green-800"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {property.publicationReady
                            ? "Pronto"
                            : "Com pendências"}
                        </span>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={
                              property.publicationReady
                                ? "h-full bg-green-600"
                                : "h-full bg-amber-500"
                            }
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(
                                  100,
                                  property.publicationProgress
                                )
                              )}%`,
                            }}
                          />
                        </div>

                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {
                            property.publicationProgress
                          }
                          % concluído
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {formatCurrency(
                        property.base_price
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {formatCurrency(
                        property.cleaning_fee
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {property.minimum_nights ??
                        "Não definido"}
                    </td>

                    <td className="px-5 py-4">
                      {formatCurrency(
                        property.minimum_price
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {formatCurrency(
                        property.maximum_price
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          property.active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {property.active
                          ? "Ativo"
                          : "Inativo"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/imoveis/${property.property_id}`}
                          style={{
                            color:
                              "#ffffff",
                          }}
                          className="inline-flex items-center justify-center rounded-lg bg-blue-950 px-4 py-2 font-bold text-white transition hover:bg-blue-900"
                        >
                          Editar
                        </Link>

                        <Link
                          href={`/admin/imoveis/${property.property_id}/preview`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-lg border border-blue-950 bg-white px-4 py-2 font-bold text-blue-950 transition hover:bg-blue-50"
                        >
                          Prévia
                        </Link>

                        <form
                          action={
                            setPropertyActive
                          }
                        >
                          <input
                            type="hidden"
                            name="propertyId"
                            value={
                              property.property_id
                            }
                          />

                          <input
                            type="hidden"
                            name="nextActive"
                            value={
                              property.active
                                ? "false"
                                : "true"
                            }
                          />

                          <button
                            type="submit"
                            className={`inline-flex items-center justify-center rounded-lg px-4 py-2 font-bold !text-white transition ${
                              property.active
                                ? "bg-red-700 hover:bg-red-800"
                                : "bg-green-700 hover:bg-green-800"
                            }`}
                          >
                            {property.active
                              ? "Desativar"
                              : "Reativar"}
                          </button>
                        </form>

                        <PropertyDeleteButton
                          propertyId={
                            property.property_id
                          }
                          propertyName={
                            property.property_name
                          }
                          active={
                            property.active
                          }
                        />
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
