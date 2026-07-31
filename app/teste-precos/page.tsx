import Link from "next/link";

import { properties } from "@/app/data/properties";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

import { calculatePropertyStayPrice } from "@/lib/pricing/calculatePropertyStayPrice";
import type { StayPriceResult } from "@/lib/pricing/calculateStayPrice";

interface TestScenario {
  name: string;
  description: string;
  checkIn: string;
  checkOut: string;
}

const testProperty = properties[0];

if (!testProperty) {
  throw new Error(
    "Nenhum imóvel foi encontrado no arquivo properties.ts."
  );
}

/**
 * Data fixa somente para que os testes
 * apresentem sempre o mesmo resultado.
 */
const referenceDate = "2026-07-30";

const scenarios: TestScenario[] = [
  {
    name: "Período comum",
    description:
      "Teste de três diárias fora de feriados e temporadas especiais.",
    checkIn: "2026-08-10",
    checkOut: "2026-08-13",
  },
  {
    name: "Feriado da Independência",
    description:
      "Pacote de três noites durante o feriado de 7 de setembro.",
    checkIn: "2026-09-05",
    checkOut: "2026-09-08",
  },
  {
    name: "Natal",
    description:
      "Período especial de Natal com mínimo de quatro noites.",
    checkIn: "2026-12-21",
    checkOut: "2026-12-27",
  },
  {
    name: "Réveillon",
    description:
      "Período de alta procura com mínimo de seis noites.",
    checkIn: "2026-12-28",
    checkOut: "2027-01-04",
  },
  {
    name: "Alta temporada de janeiro",
    description:
      "Teste de cinco noites durante a alta temporada.",
    checkIn: "2027-01-10",
    checkOut: "2027-01-15",
  },
  {
    name: "Carnaval",
    description:
      "Pacote especial de Carnaval com mínimo de cinco noites.",
    checkIn: "2027-02-05",
    checkOut: "2027-02-10",
  },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: string): string {
  const [year, month, day] = date
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(
    new Date(Date.UTC(year, month - 1, day))
  );
}

function calculateScenario(
  scenario: TestScenario
): StayPriceResult {
  return calculatePropertyStayPrice({
    property: testProperty,
    checkIn: scenario.checkIn,
    checkOut: scenario.checkOut,
    referenceDate,

    /**
     * Valores temporários usados apenas
     * para testar o ajuste por ocupação.
     */
    monthlyOccupancy: {
      "2026-08": 0.3,
      "2026-09": 0.55,
      "2026-12": 0.75,
      "2027-01": 0.65,
      "2027-02": 0.8,
    },
  });
}

export default function TestePrecosPage() {
  const results = scenarios.map(
    (scenario) => ({
      scenario,
      result: calculateScenario(scenario),
    })
  );

  return (
    <>
      <Header />

      <main className="min-h-screen bg-zinc-50 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] bg-blue-950 px-7 py-12 text-white sm:px-12">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-300">
              Teste do motor de preços
            </p>

            <h1 className="mt-4 text-4xl font-black sm:text-5xl">
              Preços dinâmicos
            </h1>

            <p className="mt-3 text-xl font-bold text-sky-200">
              Imóvel: {testProperty.title}
            </p>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/80">
              Esta página temporária mostra como o
              sistema calcula as diárias do imóvel
              usando o preço-base, a taxa de limpeza,
              os feriados e as regras de demanda.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/10 p-5">
                <p className="text-sm text-white/65">
                  Preço-base
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {formatCurrency(testProperty.price)}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-5">
                <p className="text-sm text-white/65">
                  Taxa de limpeza
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {formatCurrency(
                    testProperty.cleaningFee
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-5">
                <p className="text-sm text-white/65">
                  Data de referência
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {formatDate(referenceDate)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 space-y-10">
            {results.map(
              ({ scenario, result }) => (
                <article
                  key={scenario.name}
                  className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm"
                >
                  <div className="border-b border-zinc-200 bg-sky-50 p-7 sm:p-9">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-700">
                          {scenario.name}
                        </p>

                        <h2 className="mt-3 text-3xl font-bold text-blue-950">
                          {formatDate(
                            scenario.checkIn
                          )}{" "}
                          até{" "}
                          {formatDate(
                            scenario.checkOut
                          )}
                        </h2>

                        <p className="mt-3 max-w-3xl leading-7 text-zinc-600">
                          {scenario.description}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-blue-950 px-6 py-5 text-white">
                        <p className="text-sm text-white/65">
                          Valor total
                        </p>

                        <p className="mt-1 text-3xl font-black">
                          {formatCurrency(
                            result.total
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl bg-white p-5">
                        <p className="text-sm text-zinc-500">
                          Noites
                        </p>

                        <p className="mt-2 text-xl font-bold text-blue-950">
                          {result.nights}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white p-5">
                        <p className="text-sm text-zinc-500">
                          Mínimo exigido
                        </p>

                        <p className="mt-2 text-xl font-bold text-blue-950">
                          {
                            result.requiredMinimumNights
                          }{" "}
                          {result.requiredMinimumNights ===
                          1
                            ? "noite"
                            : "noites"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white p-5">
                        <p className="text-sm text-zinc-500">
                          Subtotal
                        </p>

                        <p className="mt-2 text-xl font-bold text-blue-950">
                          {formatCurrency(
                            result.accommodationSubtotal
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white p-5">
                        <p className="text-sm text-zinc-500">
                          Regra de estadia
                        </p>

                        <p
                          className={
                            result.minimumNightsMet
                              ? "mt-2 font-bold text-green-700"
                              : "mt-2 font-bold text-red-700"
                          }
                        >
                          {result.minimumNightsMet
                            ? "Mínimo atendido"
                            : "Mínimo não atendido"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-7 sm:p-9">
                    <h3 className="text-2xl font-bold text-blue-950">
                      Detalhamento das diárias
                    </h3>

                    <div className="mt-6 overflow-x-auto">
                      <table className="w-full min-w-[760px] border-collapse text-left">
                        <thead>
                          <tr className="border-b border-zinc-200 text-sm uppercase tracking-wide text-zinc-500">
                            <th className="px-4 py-4">
                              Data
                            </th>

                            <th className="px-4 py-4">
                              Preço
                            </th>

                            <th className="px-4 py-4">
                              Mínimo
                            </th>

                            <th className="px-4 py-4">
                              Período
                            </th>

                            <th className="px-4 py-4">
                              Ajustes aplicados
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {result.nightlyPrices.map(
                            (night) => (
                              <tr
                                key={night.date}
                                className="border-b border-zinc-100 align-top"
                              >
                                <td className="px-4 py-5 font-semibold text-blue-950">
                                  {formatDate(
                                    night.date
                                  )}
                                </td>

                                <td className="px-4 py-5 text-xl font-bold text-sky-700">
                                  {formatCurrency(
                                    night.price
                                  )}
                                </td>

                                <td className="px-4 py-5 text-zinc-700">
                                  {
                                    night.minimumNights
                                  }{" "}
                                  {night.minimumNights ===
                                  1
                                    ? "noite"
                                    : "noites"}
                                </td>

                                <td className="px-4 py-5">
                                  {night.calculation
                                    .specialRule ? (
                                    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900">
                                      {
                                        night
                                          .calculation
                                          .specialRule
                                          .label
                                      }
                                    </span>
                                  ) : (
                                    <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-600">
                                      Normal
                                    </span>
                                  )}
                                </td>

                                <td className="px-4 py-5">
                                  <ul className="space-y-2 text-sm text-zinc-600">
                                    {night.calculation
                                      .adjustments
                                      .length > 0 ? (
                                      night.calculation.adjustments.map(
                                        (
                                          adjustment,
                                          index
                                        ) => (
                                          <li
                                            key={`${night.date}-${adjustment.type}-${index}`}
                                          >
                                            •{" "}
                                            {
                                              adjustment.label
                                            }
                                          </li>
                                        )
                                      )
                                    ) : (
                                      <li>
                                        • Nenhum ajuste
                                      </li>
                                    )}
                                  </ul>
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-zinc-50 p-6 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-zinc-500">
                          Hospedagem
                        </p>

                        <p className="mt-1 font-bold text-blue-950">
                          {formatCurrency(
                            result.accommodationSubtotal
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-zinc-500">
                          Limpeza
                        </p>

                        <p className="mt-1 font-bold text-blue-950">
                          {formatCurrency(
                            result.cleaningFee
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-zinc-500">
                          Total
                        </p>

                        <p className="mt-1 text-2xl font-black text-green-700">
                          {formatCurrency(
                            result.total
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              )
            )}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/"
              className="inline-flex rounded-full bg-blue-950 px-7 py-3 font-bold text-white transition hover:bg-blue-900"
            >
              Voltar para a página inicial
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}