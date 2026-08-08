"use client";

import Link from "next/link";
import {
  useRouter,
} from "next/navigation";
import {
  useMemo,
  useState,
} from "react";

import {
  duplicateProperty,
  movePropertyDisplayOrder,
  setPropertyActive,
  setPropertyFeatured,
} from "@/app/admin/imoveis/catalog-actions";

import PropertyDeleteButton from "@/components/admin/PropertyDeleteButton";

export type AdminPropertyListItem = {
  property_id: string;
  property_name: string;
  neighborhood: string;
  image: string;
  base_price: number;
  cleaning_fee: number | null;
  minimum_nights: number | null;
  minimum_price: number | null;
  maximum_price: number | null;
  active: boolean;
  featured: boolean;
  publicationReady: boolean;
  publicationProgress: number;
  displayOrder: number;
};

type AdminPropertyTableProps = {
  properties: AdminPropertyListItem[];
};

const MAX_HOME_FEATURED = 3;

type PropertyFilter =
  | "all"
  | "active"
  | "inactive"
  | "featured"
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
  const router = useRouter();

  const [query, setQuery] =
    useState("");

  const [filter, setFilter] =
    useState<PropertyFilter>("all");

  const [
    movingPropertyId,
    setMovingPropertyId,
  ] = useState<string | null>(
    null
  );

  const [
    duplicatingPropertyId,
    setDuplicatingPropertyId,
  ] = useState<string | null>(
    null
  );

  const [
    duplicateSourceProperty,
    setDuplicateSourceProperty,
  ] = useState<AdminPropertyListItem | null>(
    null
  );

  const [
    duplicateTitle,
    setDuplicateTitle,
  ] = useState("");

  const [
    duplicatePropertyId,
    setDuplicatePropertyId,
  ] = useState("");

  const [
    duplicateError,
    setDuplicateError,
  ] = useState("");

  const [
    updatingFeaturedPropertyId,
    setUpdatingFeaturedPropertyId,
  ] = useState<string | null>(
    null
  );

  const [
    copiedPropertyId,
    setCopiedPropertyId,
  ] = useState<string | null>(
    null
  );

  async function copyPublicPropertyLink(
    propertyId: string
  ) {
    const propertyUrl =
      `https://alugacasabuzios.com.br/imoveis/${encodeURIComponent(
        propertyId
      )}`;

    try {
      await navigator.clipboard.writeText(
        propertyUrl
      );

      setCopiedPropertyId(
        propertyId
      );

      window.setTimeout(() => {
        setCopiedPropertyId(
          (currentPropertyId) =>
            currentPropertyId ===
            propertyId
              ? null
              : currentPropertyId
        );
      }, 2000);
    } catch (error) {
      console.error(
        "Erro ao copiar o link público do imóvel:",
        error
      );

      window.prompt(
        "Copie o link público do imóvel:",
        propertyUrl
      );
    }
  }

  const propertyPositionById =
    useMemo(
      () =>
        new Map(
          properties.map(
            (property, index) => [
              property.property_id,
              index,
            ]
          )
        ),
      [properties]
    );

  async function moveProperty(
    propertyId: string,
    direction: "up" | "down"
  ) {
    if (movingPropertyId) {
      return;
    }

    setMovingPropertyId(
      propertyId
    );

    try {
      const formData =
        new FormData();

      formData.set(
        "propertyId",
        propertyId
      );

      formData.set(
        "direction",
        direction
      );

      const result =
        await movePropertyDisplayOrder(
          formData
        );

      if (!result.ok) {
        window.alert(
          result.message
        );

        return;
      }

      router.refresh();
    } catch (error) {
      console.error(
        "Erro ao alterar a ordem do imóvel:",
        error
      );

      window.alert(
        "Não foi possível alterar a ordem do imóvel."
      );
    } finally {
      setMovingPropertyId(
        null
      );
    }
  }

  async function togglePropertyFeatured(
    property: AdminPropertyListItem
  ) {
    if (updatingFeaturedPropertyId) {
      return;
    }

    if (
      !property.featured &&
      !property.active
    ) {
      window.alert(
        "Ative o imóvel antes de adicioná-lo aos destaques da Home."
      );
      return;
    }

    if (
      !property.featured &&
      counts.featured >=
        MAX_HOME_FEATURED
    ) {
      window.alert(
        `A Home permite no máximo ${MAX_HOME_FEATURED} imóveis em destaque. Remova um destaque antes de escolher outro.`
      );
      return;
    }

    setUpdatingFeaturedPropertyId(
      property.property_id
    );

    try {
      const formData =
        new FormData();

      formData.set(
        "propertyId",
        property.property_id
      );

      formData.set(
        "nextFeatured",
        property.featured
          ? "false"
          : "true"
      );

      const result =
        await setPropertyFeatured(
          formData
        );

      if (!result.ok) {
        window.alert(
          result.message
        );

        return;
      }

      router.refresh();
    } catch (error) {
      console.error(
        "Erro ao alterar o destaque do imóvel:",
        error
      );

      window.alert(
        "Não foi possível alterar o destaque do imóvel."
      );
    } finally {
      setUpdatingFeaturedPropertyId(
        null
      );
    }
  }

  function normalizeDuplicatePropertyId(
    value: string
  ): string {
    return value
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .toLowerCase()
      .trim()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );
  }

  function openDuplicateModal(
    property: AdminPropertyListItem
  ) {
    if (duplicatingPropertyId) {
      return;
    }

    setDuplicateSourceProperty(
      property
    );
    setDuplicateTitle(
      `${property.property_name} - Cópia`
    );
    setDuplicatePropertyId(
      `${property.property_id}-copia`
    );
    setDuplicateError("");
  }

  function closeDuplicateModal() {
    if (duplicatingPropertyId) {
      return;
    }

    setDuplicateSourceProperty(
      null
    );
    setDuplicateTitle("");
    setDuplicatePropertyId("");
    setDuplicateError("");
  }

  async function submitDuplicateProperty() {
    const property =
      duplicateSourceProperty;

    if (
      !property ||
      duplicatingPropertyId
    ) {
      return;
    }

    const newTitle =
      duplicateTitle.trim();

    const newPropertyId =
      normalizeDuplicatePropertyId(
        duplicatePropertyId
      );

    if (!newTitle) {
      setDuplicateError(
        "Informe o título da nova casa."
      );
      return;
    }

    if (!newPropertyId) {
      setDuplicateError(
        "Informe um identificador válido para a nova casa."
      );
      return;
    }

    if (
      newPropertyId ===
      property.property_id
    ) {
      setDuplicateError(
        "A nova casa precisa ter um identificador diferente do imóvel original."
      );
      return;
    }

    setDuplicateError("");
    setDuplicatePropertyId(
      newPropertyId
    );
    setDuplicatingPropertyId(
      property.property_id
    );

    try {
      const formData =
        new FormData();

      formData.set(
        "sourcePropertyId",
        property.property_id
      );

      formData.set(
        "newTitle",
        newTitle
      );

      formData.set(
        "newPropertyId",
        newPropertyId
      );

      const result =
        await duplicateProperty(
          formData
        );

      if (!result.ok) {
        setDuplicateError(
          result.message
        );
        return;
      }

      setDuplicateSourceProperty(
        null
      );

      router.push(
        `/admin/imoveis/${encodeURIComponent(
          result.propertyId
        )}`
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Erro ao duplicar o imóvel:",
        error
      );

      setDuplicateError(
        "Não foi possível duplicar o imóvel."
      );
    } finally {
      setDuplicatingPropertyId(
        null
      );
    }
  }

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
      featured: properties.filter(
        (property) =>
          property.active &&
          property.featured
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

            case "featured":
              return (
                property.active &&
                property.featured
              );

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
      id: "featured",
      label: "Destaques",
      count: counts.featured,
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

  const summaryCards: {
    id: PropertyFilter;
    label: string;
    count: number;
    className: string;
  }[] = [
    {
      id: "all",
      label: "Total de imóveis",
      count: counts.all,
      className:
        "border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100",
    },
    {
      id: "active",
      label: "Ativos",
      count: counts.active,
      className:
        "border-green-200 bg-green-50 text-green-900 hover:bg-green-100",
    },
    {
      id: "inactive",
      label: "Inativos",
      count: counts.inactive,
      className:
        "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
    },
    {
      id: "featured",
      label: "Destaques",
      count: counts.featured,
      className:
        "border-violet-200 bg-violet-50 text-violet-950 hover:bg-violet-100",
    },
    {
      id: "ready",
      label: "Prontos para publicar",
      count: counts.ready,
      className:
        "border-sky-200 bg-sky-50 text-sky-950 hover:bg-sky-100",
    },
    {
      id: "pending",
      label: "Com pendências",
      count: counts.pending,
      className:
        "border-red-200 bg-red-50 text-red-900 hover:bg-red-100",
    },
  ];

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-lg">
      <style>{`
        .admin-property-mobile {
          display: none;
        }

        .admin-property-desktop {
          display: block;
        }

        @media (max-width: 767px) {
          .admin-property-mobile {
            display: block;
          }

          .admin-property-desktop {
            display: none;
          }
        }
      `}</style>
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

        <div
          aria-label="Resumo dos imóveis"
          className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        >
          {summaryCards.map((card) => {
            const selected =
              filter === card.id &&
              normalizedQuery.length === 0;

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setQuery("");
                  setFilter(card.id);
                }}
                aria-pressed={selected}
                className={`min-h-28 rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${card.className} ${
                  selected
                    ? "ring-2 ring-blue-950 ring-offset-2"
                    : ""
                }`}
              >
                <span className="block text-3xl font-black leading-none">
                  {card.count}
                </span>

                <span className="mt-3 block text-sm font-bold">
                  {card.label}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className={`mt-4 rounded-2xl border p-4 ${
            counts.featured > MAX_HOME_FEATURED
              ? "border-red-200 bg-red-50 text-red-900"
              : counts.featured === MAX_HOME_FEATURED
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-violet-200 bg-violet-50 text-violet-950"
          }`}
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="font-bold">
              Destaques da Home: {counts.featured} de{" "}
              {MAX_HOME_FEATURED}
            </p>

            <p className="text-sm font-semibold">
              {counts.featured > MAX_HOME_FEATURED
                ? "Existem destaques antigos acima do limite. Remova os excedentes."
                : counts.featured === MAX_HOME_FEATURED
                  ? "Limite atingido. Remova um destaque para escolher outro."
                  : `Você ainda pode destacar ${
                      MAX_HOME_FEATURED -
                      counts.featured
                    } ${
                      MAX_HOME_FEATURED -
                        counts.featured ===
                      1
                        ? "imóvel"
                        : "imóveis"
                    }.`}
            </p>
          </div>
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
        <>
          <div className="admin-property-mobile space-y-4 p-4">
            {filteredProperties.map(
              (property) => {
                const position =
                  propertyPositionById.get(
                    property.property_id
                  ) ?? -1;

                const isMoving =
                  movingPropertyId ===
                  property.property_id;

                const canMoveUp =
                  position > 0;

                const canMoveDown =
                  position >= 0 &&
                  position <
                    properties.length - 1;

                return (
                  <article
                    key={
                      property.property_id
                    }
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                            {property.image ? (
                              <img
                                src={property.image}
                                alt={`Foto principal de ${property.property_name}`}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs font-bold text-slate-400">
                                Sem foto
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="text-base font-bold leading-snug text-slate-950">
                              {
                                property.property_name
                              }
                            </h3>

                            {property.neighborhood && (
                              <p className="mt-1 text-sm font-semibold text-slate-600">
                                {
                                  property.neighborhood
                                }
                              </p>
                            )}

                            <p className="mt-1 break-all text-xs text-slate-500">
                              {
                                property.property_id
                              }
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              property.active
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {property.active
                              ? "Ativo"
                              : "Inativo"}
                          </span>

                          {property.featured && (
                            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-900">
                              ★ Destaque
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5 p-4">
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                              property.publicationReady
                                ? "bg-green-100 text-green-800"
                                : "bg-amber-100 text-amber-900"
                            }`}
                          >
                            {property.publicationReady
                              ? "Pronto para publicar"
                              : "Com pendências"}
                          </span>

                          <span className="text-sm font-bold text-slate-700">
                            {
                              property.publicationProgress
                            }
                            %
                          </span>
                        </div>

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
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Preço-base
                          </p>

                          <p className="mt-1 font-bold text-slate-950">
                            {formatCurrency(
                              property.base_price
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Mínimo
                          </p>

                          <p className="mt-1 font-bold text-slate-950">
                            {property.minimum_nights ??
                              "Não definido"}{" "}
                            {property.minimum_nights
                              ? property.minimum_nights ===
                                1
                                ? "noite"
                                : "noites"
                              : ""}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Limpeza
                          </p>

                          <p className="mt-1 font-semibold text-slate-800">
                            {formatCurrency(
                              property.cleaning_fee
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Faixa de preço
                          </p>

                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-800">
                            {formatCurrency(
                              property.minimum_price
                            )}
                            {" — "}
                            {formatCurrency(
                              property.maximum_price
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              Ordem no site
                            </p>

                            <p className="mt-1 font-bold text-slate-950">
                              Posição{" "}
                              {position + 1}
                            </p>
                          </div>

                          {isMoving && (
                            <p
                              aria-live="polite"
                              className="text-xs font-semibold text-blue-800"
                            >
                              Atualizando...
                            </p>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              moveProperty(
                                property.property_id,
                                "up"
                              )
                            }
                            disabled={
                              !canMoveUp ||
                              Boolean(
                                movingPropertyId
                              )
                            }
                            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`Subir ${property.property_name} na ordem`}
                          >
                            ↑ Subir
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              moveProperty(
                                property.property_id,
                                "down"
                              )
                            }
                            disabled={
                              !canMoveDown ||
                              Boolean(
                                movingPropertyId
                              )
                            }
                            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`Descer ${property.property_name} na ordem`}
                          >
                            ↓ Descer
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Ações
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                          <Link
                            href={`/admin/imoveis/${property.property_id}`}
                            style={{
                              color:
                                "#ffffff",
                            }}
                            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-950 px-3 py-2 text-center text-sm font-bold text-white transition hover:bg-blue-900"
                          >
                            Editar
                          </Link>

                          <Link
                            href={`/admin/imoveis/${property.property_id}/preview`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-blue-950 bg-white px-3 py-2 text-center text-sm font-bold text-blue-950 transition hover:bg-blue-50"
                          >
                            Prévia
                          </Link>

                          {property.active && (
                            <button
                              type="button"
                              onClick={() =>
                                copyPublicPropertyLink(
                                  property.property_id
                                )
                              }
                              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-center text-sm font-bold text-emerald-900 transition hover:bg-emerald-100"
                            >
                              {copiedPropertyId ===
                              property.property_id
                                ? "Link copiado"
                                : "Copiar link"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              togglePropertyFeatured(
                                property
                              )
                            }
                            disabled={
                              Boolean(
                                updatingFeaturedPropertyId
                              ) ||
                              (
                                !property.featured &&
                                (
                                  !property.active ||
                                  counts.featured >=
                                    MAX_HOME_FEATURED
                                )
                              )
                            }
                            className={`inline-flex min-h-11 items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              property.featured
                                ? "border-yellow-400 bg-yellow-100 text-yellow-950 hover:bg-yellow-200"
                                : "border-slate-300 bg-white text-slate-800 hover:border-yellow-300 hover:bg-yellow-50"
                            }`}
                          >
                            {updatingFeaturedPropertyId ===
                            property.property_id
                              ? "Atualizando..."
                              : property.featured
                                ? "Remover destaque"
                                : !property.active
                                  ? "Ative para destacar"
                                  : counts.featured >=
                                      MAX_HOME_FEATURED
                                    ? "Limite de 3 atingido"
                                    : "Destacar"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openDuplicateModal(
                                property
                              )
                            }
                            disabled={Boolean(
                              duplicatingPropertyId
                            )}
                            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-center text-sm font-bold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {duplicatingPropertyId ===
                            property.property_id
                              ? "Duplicando..."
                              : "Duplicar"}
                          </button>

                          <form
                            action={
                              setPropertyActive
                            }
                            className="contents"
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
                              className={`inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-center text-sm font-bold !text-white transition ${
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

                          <div className="min-h-11">
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
                        </div>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>

          <div className="admin-property-desktop overflow-x-auto">
            <table className="w-full min-w-[1540px] text-left">
            <thead className="bg-slate-50 text-sm text-slate-700">
              <tr>
                <th scope="col" className="px-5 py-4">
                  Imóvel
                </th>

                <th scope="col" className="px-5 py-4">
                  Ordem
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
                  Destaque
                </th>

                <th scope="col" className="px-5 py-4">
                  Status
                </th>

                <th
                  scope="col"
                  className="sticky right-0 z-30 min-w-[280px] border-l border-slate-200 bg-slate-50 px-5 py-4 shadow-[-8px_0_16px_-14px_rgba(15,23,42,0.45)]"
                >
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
                    className="group text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex min-w-64 items-center gap-3">
                        <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          {property.image ? (
                            <img
                              src={property.image}
                              alt={`Foto principal de ${property.property_name}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] font-bold text-slate-400">
                              Sem foto
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
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

                          <p className="mt-1 break-all text-xs text-slate-500">
                            {
                              property.property_id
                            }
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {(() => {
                        const position =
                          propertyPositionById.get(
                            property.property_id
                          ) ?? -1;

                        const isMoving =
                          movingPropertyId ===
                          property.property_id;

                        const canMoveUp =
                          position > 0;

                        const canMoveDown =
                          position >= 0 &&
                          position <
                            properties.length -
                              1;

                        return (
                          <div className="min-w-40">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              Posição{" "}
                              {position + 1}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  moveProperty(
                                    property.property_id,
                                    "up"
                                  )
                                }
                                disabled={
                                  !canMoveUp ||
                                  Boolean(
                                    movingPropertyId
                                  )
                                }
                                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={`Subir ${property.property_name} na ordem`}
                              >
                                ↑ Subir
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  moveProperty(
                                    property.property_id,
                                    "down"
                                  )
                                }
                                disabled={
                                  !canMoveDown ||
                                  Boolean(
                                    movingPropertyId
                                  )
                                }
                                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={`Descer ${property.property_name} na ordem`}
                              >
                                ↓ Descer
                              </button>
                            </div>

                            {isMoving && (
                              <p
                                aria-live="polite"
                                className="mt-2 text-xs font-semibold text-blue-800"
                              >
                                Atualizando ordem...
                              </p>
                            )}
                          </div>
                        );
                      })()}
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
                          property.featured
                            ? "bg-yellow-100 text-yellow-900"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {property.featured
                          ? "★ Destaque"
                          : "Normal"}
                      </span>
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

                    <td className="sticky right-0 z-20 min-w-[280px] border-l border-slate-200 bg-white px-5 py-4 shadow-[-8px_0_16px_-14px_rgba(15,23,42,0.45)] transition-colors group-hover:bg-slate-50">
                      <div className="flex min-w-[240px] flex-wrap gap-2">
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

                        {property.active && (
                          <button
                            type="button"
                            onClick={() =>
                              copyPublicPropertyLink(
                                property.property_id
                              )
                            }
                            className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 font-bold text-emerald-900 transition hover:bg-emerald-100"
                          >
                            {copiedPropertyId ===
                            property.property_id
                              ? "Link copiado"
                              : "Copiar link"}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            togglePropertyFeatured(
                              property
                            )
                          }
                          disabled={
                            Boolean(
                              updatingFeaturedPropertyId
                            ) ||
                            (
                              !property.featured &&
                              (
                                !property.active ||
                                counts.featured >=
                                  MAX_HOME_FEATURED
                              )
                            )
                          }
                          className={`inline-flex items-center justify-center rounded-lg border px-4 py-2 font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            property.featured
                              ? "border-yellow-400 bg-yellow-100 text-yellow-950 hover:bg-yellow-200"
                              : "border-slate-300 bg-white text-slate-800 hover:border-yellow-300 hover:bg-yellow-50"
                          }`}
                        >
                          {updatingFeaturedPropertyId ===
                          property.property_id
                            ? "Atualizando..."
                            : property.featured
                              ? "Remover destaque"
                              : !property.active
                                ? "Ative para destacar"
                                : counts.featured >=
                                    MAX_HOME_FEATURED
                                  ? "Limite de 3 atingido"
                                  : "Destacar"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openDuplicateModal(
                              property
                            )
                          }
                          disabled={Boolean(
                            duplicatingPropertyId
                          )}
                          className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 font-bold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {duplicatingPropertyId ===
                          property.property_id
                            ? "Duplicando..."
                            : "Duplicar"}
                        </button>

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
        </>
      )}

      {duplicateSourceProperty && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="duplicate-property-title"
        >
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                  Duplicar imóvel
                </p>

                <h3
                  id="duplicate-property-title"
                  className="mt-1 text-xl font-black text-slate-950"
                >
                  Criar uma nova casa a partir de{" "}
                  {duplicateSourceProperty.property_name}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeDuplicateModal}
                disabled={Boolean(
                  duplicatingPropertyId
                )}
                aria-label="Fechar"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submitDuplicateProperty();
              }}
              className="space-y-5 p-5 sm:p-6"
            >
              <div>
                <label
                  htmlFor="duplicate-property-name"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  Nome da nova casa
                </label>

                <input
                  id="duplicate-property-name"
                  type="text"
                  value={duplicateTitle}
                  onChange={(event) => {
                    setDuplicateTitle(
                      event.target.value
                    );
                    setDuplicateError("");
                  }}
                  autoFocus
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="duplicate-property-id"
                    className="block text-sm font-bold text-slate-800"
                  >
                    Identificador / URL
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setDuplicatePropertyId(
                        normalizeDuplicatePropertyId(
                          duplicateTitle
                        )
                      );
                      setDuplicateError("");
                    }}
                    className="text-xs font-bold text-blue-800 underline underline-offset-2"
                  >
                    Gerar pelo nome
                  </button>
                </div>

                <input
                  id="duplicate-property-id"
                  type="text"
                  value={duplicatePropertyId}
                  onChange={(event) => {
                    setDuplicatePropertyId(
                      normalizeDuplicatePropertyId(
                        event.target.value
                      )
                    );
                    setDuplicateError("");
                  }}
                  spellCheck={false}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-950 outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-2 text-xs text-slate-500">
                  A página será criada em /imoveis/
                  {duplicatePropertyId ||
                    "identificador-da-casa"}.
                  Use um identificador único.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-black">
                  O que será copiado
                </p>

                <p className="mt-1 leading-6">
                  Dados do imóvel, comodidades, regras,
                  localização, WhatsApp e preços.
                  A nova casa será criada inativa.
                </p>

                <p className="mt-2 font-semibold leading-6">
                  Fotos, avaliações, destaque e links do
                  Airbnb/Booking não serão copiados.
                </p>
              </div>

              {duplicateError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800"
                >
                  {duplicateError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDuplicateModal}
                  disabled={Boolean(
                    duplicatingPropertyId
                  )}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={Boolean(
                    duplicatingPropertyId
                  )}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-600 px-5 py-3 font-black !text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {duplicatingPropertyId
                    ? "Criando cópia..."
                    : "Criar cópia"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
