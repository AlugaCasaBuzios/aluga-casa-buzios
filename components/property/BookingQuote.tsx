"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
  DayPicker,
  type DateRange,
} from "@daypicker/react";

import { ptBR } from "@daypicker/react/locale";

import "@daypicker/react/style.css";

interface BookingQuoteProps {
  propertyId: string;
  propertyTitle: string;
  whatsapp: string;
  maximumGuests: number;
}

interface BlockedPeriod {
  startDate: string;
  endDateExclusive: string;
}

interface AvailabilitySuccessResponse {
  success: true;

  property: {
    id: string;
    title: string;
  };

  calendarConfigured: boolean;
  blockedPeriods: BlockedPeriod[];
  lastCheckedAt?: string;
}

interface AvailabilityErrorResponse {
  success: false;
  error: string;
}

type AvailabilityResponse =
  | AvailabilitySuccessResponse
  | AvailabilityErrorResponse;

interface QuoteResult {
  checkIn: string;
  checkOut: string;
  nights: number;
  requiredMinimumNights: number;
  minimumNightsMet: boolean;
  accommodationSubtotal: number;
  cleaningFee: number;
  total: number;
}

interface QuoteSuccessResponse {
  success: true;

  property: {
    id: string;
    title: string;
    neighborhood: string;
    basePrice: number;
    cleaningFee: number;
  };

  availabilityConfirmed?: boolean;
  quote: QuoteResult;
}

interface QuoteErrorResponse {
  success: false;
  error: string;

  unavailablePeriod?: {
    startDate: string;
    endDateExclusive: string;
  };
}

type QuoteResponse =
  | QuoteSuccessResponse
  | QuoteErrorResponse;

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
  }).format(
    new Date(
      year,
      month - 1,
      day,
      12
    )
  );
}

/**
 * Converte uma data YYYY-MM-DD
 * para um objeto Date no horário local.
 *
 * O horário do meio-dia evita alterações
 * provocadas pelo fuso horário.
 */
function parseDateOnly(
  value: string
): Date | null {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day,
    12
  );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDateOnly(
  date: Date
): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getToday(): Date {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12
  );
}

function addDays(
  date: Date,
  numberOfDays: number
): Date {
  const result = new Date(date);

  result.setDate(
    result.getDate() + numberOfDays
  );

  return result;
}

function isDateInsideBlockedPeriod(
  date: Date,
  blockedPeriods: BlockedPeriod[]
): boolean {
  const dateValue =
    formatDateOnly(date);

  return blockedPeriods.some(
    (period) =>
      dateValue >= period.startDate &&
      dateValue <
        period.endDateExclusive
  );
}

function rangeOverlapsBlockedPeriod(
  from: Date,
  to: Date,
  blockedPeriods: BlockedPeriod[]
): boolean {
  const checkIn =
    formatDateOnly(from);

  const checkOut =
    formatDateOnly(to);

  return blockedPeriods.some(
    (period) =>
      checkIn <
        period.endDateExclusive &&
      checkOut >
        period.startDate
  );
}

export default function BookingQuote({
  propertyId,
  propertyTitle,
  whatsapp,
  maximumGuests,
}: BookingQuoteProps) {
  const [
    selectedRange,
    setSelectedRange,
  ] = useState<
    DateRange | undefined
  >();

  const [
    blockedPeriods,
    setBlockedPeriods,
  ] = useState<BlockedPeriod[]>(
    []
  );

  const [
    calendarConfigured,
    setCalendarConfigured,
  ] = useState<
    boolean | null
  >(null);

  const [
    isCalendarLoading,
    setIsCalendarLoading,
  ] = useState(true);

  const [
    availabilityError,
    setAvailabilityError,
  ] = useState("");

  const [quote, setQuote] =
    useState<QuoteResult | null>(
      null
    );

  const [error, setError] =
    useState("");

  const [guestCount, setGuestCount] =
    useState("1");

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const today = useMemo(
    () => getToday(),
    []
  );

  const finalCalendarMonth =
    useMemo(
      () =>
        new Date(
          today.getFullYear() + 2,
          11,
          1,
          12
        ),
      [today]
    );

  /**
   * Períodos completos usados para
   * riscar visualmente os dias ocupados.
   */
  const blockedDateRanges =
    useMemo<DateRange[]>(() => {
      return blockedPeriods.flatMap(
        (period) => {
          const from =
            parseDateOnly(
              period.startDate
            );

          const endExclusive =
            parseDateOnly(
              period.endDateExclusive
            );

          if (
            !from ||
            !endExclusive
          ) {
            return [];
          }

          const to = addDays(
            endExclusive,
            -1
          );

          if (to < from) {
            return [];
          }

          return [
            {
              from,
              to,
            },
          ];
        }
      );
    }, [blockedPeriods]);

  /**
   * Deixa o primeiro dia do bloqueio disponível
   * somente para ser utilizado como check-out.
   *
   * Exemplo:
   * se uma reserva começa em 05/01,
   * outro hóspede pode sair em 05/01.
   */
  const disabledDateRanges =
    useMemo<DateRange[]>(() => {
      return blockedPeriods.flatMap(
        (period) => {
          const start =
            parseDateOnly(
              period.startDate
            );

          const endExclusive =
            parseDateOnly(
              period.endDateExclusive
            );

          if (
            !start ||
            !endExclusive
          ) {
            return [];
          }

          const from = addDays(
            start,
            1
          );

          const to = addDays(
            endExclusive,
            -1
          );

          if (to < from) {
            return [];
          }

          return [
            {
              from,
              to,
            },
          ];
        }
      );
    }, [blockedPeriods]);

  const checkIn =
    selectedRange?.from
      ? formatDateOnly(
          selectedRange.from
        )
      : "";

  const checkOut =
    selectedRange?.to
      ? formatDateOnly(
          selectedRange.to
        )
      : "";

  useEffect(() => {
    const controller =
      new AbortController();

    let isActive = true;

    async function loadAvailability() {
      setIsCalendarLoading(true);
      setAvailabilityError("");
      setBlockedPeriods([]);

      try {
        const response =
          await fetch(
            `/api/availability/${encodeURIComponent(
              propertyId
            )}`,
            {
              method: "GET",
              cache: "no-store",
              signal:
                controller.signal,
            }
          );

        const data =
          (await response.json()) as
            AvailabilityResponse;

        if (!data.success) {
          throw new Error(
            data.error
          );
        }

        if (!isActive) {
          return;
        }

        setCalendarConfigured(
          data.calendarConfigured
        );

        setBlockedPeriods(
          data.blockedPeriods
        );
      } catch (
        caughtError
      ) {
        if (
          caughtError instanceof
            DOMException &&
          caughtError.name ===
            "AbortError"
        ) {
          return;
        }

        if (!isActive) {
          return;
        }

        setCalendarConfigured(
          null
        );

        setAvailabilityError(
          caughtError instanceof
            Error
            ? caughtError.message
            : "Não foi possível carregar a disponibilidade."
        );
      } finally {
        if (isActive) {
          setIsCalendarLoading(
            false
          );
        }
      }
    }

    loadAvailability();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [propertyId]);

  function handleRangeSelection(
    range: DateRange | undefined
  ) {
    setQuote(null);
    setError("");

    if (!range?.from) {
      setSelectedRange(
        undefined
      );

      return;
    }

    /**
     * Impede o início de uma hospedagem
     * em uma data bloqueada.
     */
    if (
      isDateInsideBlockedPeriod(
        range.from,
        blockedPeriods
      )
    ) {
      setError(
        "Essa data está indisponível para check-in."
      );

      setSelectedRange(
        undefined
      );

      return;
    }

    /**
     * Quando o check-out já foi escolhido,
     * verifica se existem noites bloqueadas
     * dentro do período.
     */
    if (
      range.to &&
      rangeOverlapsBlockedPeriod(
        range.from,
        range.to,
        blockedPeriods
      )
    ) {
      setError(
        "O período selecionado possui datas indisponíveis. Escolha outro período."
      );

      setSelectedRange({
        from: range.from,
        to: undefined,
      });

      return;
    }

    setSelectedRange(range);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setQuote(null);

    const numberOfGuests =
      Number(guestCount);

    if (
      !Number.isInteger(
        numberOfGuests
      ) ||
      numberOfGuests < 1 ||
      numberOfGuests >
        maximumGuests
    ) {
      setError(
        `Informe uma quantidade de hóspedes entre 1 e ${maximumGuests}.`
      );

      return;
    }

    if (
      !selectedRange?.from ||
      !selectedRange.to ||
      !checkIn ||
      !checkOut
    ) {
      setError(
        "Selecione as datas de check-in e check-out."
      );

      return;
    }

    if (
      checkOut <= checkIn
    ) {
      setError(
        "O check-out precisa ser posterior ao check-in."
      );

      return;
    }

    setIsLoading(true);

    try {
      const response =
        await fetch(
          "/api/pricing/quote",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              propertyId,
              checkIn,
              checkOut,
            }),
          }
        );

      const data =
        (await response.json()) as
          QuoteResponse;

      if (!data.success) {
        setError(data.error);
        return;
      }

      setQuote(data.quote);
    } catch {
      setError(
        "Não foi possível calcular o orçamento. Tente novamente."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function createWhatsAppUrl(): string {
    if (!quote) {
      return `https://wa.me/${whatsapp}`;
    }

    const propertyUrl =
      `https://alugacasabuzios.com.br/imoveis/${propertyId}`;

    const numberOfGuests =
      Number(guestCount);

    const message = [
      "Olá! Vim pelo site da Aluga Casa Búzios e gostaria de consultar uma hospedagem.",
      "",
      `🏠 Imóvel: ${propertyTitle}`,
      `📅 Check-in: ${formatDate(
        quote.checkIn
      )}`,
      `📅 Check-out: ${formatDate(
        quote.checkOut
      )}`,
      `🌙 Quantidade de noites: ${quote.nights}`,
      `👥 Hóspedes: ${numberOfGuests}`,
      "",
      "Resumo do orçamento:",
      `Hospedagem: ${formatCurrency(
        quote.accommodationSubtotal
      )}`,
      `Taxa de limpeza: ${formatCurrency(
        quote.cleaningFee
      )}`,
      `Valor total estimado: ${formatCurrency(
        quote.total
      )}`,
      `Mínimo exigido: ${quote.requiredMinimumNights} ${
        quote.requiredMinimumNights === 1
          ? "noite"
          : "noites"
      }`,
      "",
      `Página do imóvel: ${propertyUrl}`,
      "",
      "Poderia confirmar a disponibilidade e informar as condições para a reserva?",
    ].join("\n");

    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(
      message
    )}`;
  }

  return (
    <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-lg sm:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-700">
        Consulte sua hospedagem
      </p>

      <h2 className="mt-3 text-3xl font-black text-blue-950">
        Calcule o valor da estadia
      </h2>

      <p className="mt-3 leading-7 text-zinc-600">
        Escolha primeiro o dia de entrada e
        depois o dia de saída. As datas riscadas
        estão indisponíveis.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-7 space-y-5"
      >
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-3">
          {isCalendarLoading ? (
            <div className="flex min-h-80 items-center justify-center text-center text-zinc-600">
              <div>
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-950" />

                <p className="mt-4 font-semibold">
                  Carregando disponibilidade...
                </p>
              </div>
            </div>
          ) : (
            <DayPicker
              animate
              mode="range"
              locale={ptBR}
              weekStartsOn={0}
              selected={
                selectedRange
              }
              onSelect={
                handleRangeSelection
              }
              min={1}
              resetOnSelect
              excludeDisabled
              showOutsideDays
              fixedWeeks
              startMonth={today}
              endMonth={
                finalCalendarMonth
              }
              disabled={[
                {
                  before: today,
                },
                ...disabledDateRanges,
              ]}
              modifiers={{
                booked:
                  blockedDateRanges,
              }}
              modifiersClassNames={{
                booked:
                  "cursor-not-allowed",
              }}
              modifiersStyles={{
                booked: {
                  color: "#a1a1aa",
                  opacity: 0.65,
                  textDecoration:
                    "line-through",
                  textDecorationThickness:
                    "2px",
                },
              }}
              className="mx-auto w-full"
              footer={
                selectedRange?.from ? (
                  selectedRange.to ? (
                    <p className="mt-4 text-center text-sm font-semibold text-blue-950">
                      {formatDate(
                        formatDateOnly(
                          selectedRange.from
                        )
                      )}{" "}
                      até{" "}
                      {formatDate(
                        formatDateOnly(
                          selectedRange.to
                        )
                      )}
                    </p>
                  ) : (
                    <p className="mt-4 text-center text-sm font-semibold text-sky-700">
                      Agora selecione o
                      check-out.
                    </p>
                  )
                ) : (
                  <p className="mt-4 text-center text-sm text-zinc-500">
                    Selecione primeiro o
                    check-in.
                  </p>
                )
              }
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-5 rounded-xl bg-zinc-50 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded bg-blue-950" />

            <span className="text-zinc-700">
              Selecionado
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400 line-through decoration-2">
              28
            </span>

            <span className="text-zinc-700">
              Indisponível
            </span>
          </div>
        </div>

        {calendarConfigured ===
          false && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
            Este imóvel ainda não possui
            calendário automático. A
            disponibilidade será confirmada pelo
            WhatsApp.
          </div>
        )}

        {availabilityError && (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900"
          >
            Não foi possível atualizar o
            calendário neste momento. O sistema
            fará uma nova verificação ao calcular
            o orçamento.
          </div>
        )}

        {selectedRange?.from && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-sky-50 p-4">
              <p className="text-sm text-zinc-500">
                Check-in
              </p>

              <p className="mt-1 font-bold text-blue-950">
                {formatDate(
                  checkIn
                )}
              </p>
            </div>

            <div className="rounded-xl bg-sky-50 p-4">
              <p className="text-sm text-zinc-500">
                Check-out
              </p>

              <p className="mt-1 font-bold text-blue-950">
                {checkOut
                  ? formatDate(
                      checkOut
                    )
                  : "Selecione a saída"}
              </p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <label
            htmlFor={`guest-count-${propertyId}`}
            className="block font-bold text-blue-950"
          >
            Quantidade de hóspedes
          </label>

          <input
            id={`guest-count-${propertyId}`}
            name="guestCount"
            type="number"
            inputMode="numeric"
            min={1}
            max={maximumGuests}
            step={1}
            required
            value={guestCount}
            onChange={(event) => {
              setGuestCount(
                event.target.value
              );
              setQuote(null);
              setError("");
            }}
            className="mt-3 min-h-12 w-full rounded-xl border border-zinc-300 px-4 text-blue-950 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-200"
          />

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Este imóvel acomoda no máximo{" "}
            {maximumGuests}{" "}
            {maximumGuests === 1
              ? "hóspede"
              : "hóspedes"}.
          </p>
        </div>

        <button
          type="submit"
          disabled={
            isLoading ||
            isCalendarLoading ||
            !selectedRange?.from ||
            !selectedRange.to
          }
          className="w-full rounded-full bg-blue-950 px-6 py-4 font-bold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading
            ? "Calculando..."
            : "Calcular hospedagem"}
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold leading-6 text-red-800"
        >
          {error}
        </div>
      )}

      {quote && (
        <div className="mt-7 rounded-2xl bg-sky-50 p-6">
          <div className="flex flex-col gap-4 border-b border-sky-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-600">
                Valor estimado
              </p>

              <p className="mt-1 text-4xl font-black text-blue-950">
                {formatCurrency(
                  quote.total
                )}
              </p>
            </div>

            <p className="font-semibold text-zinc-700">
              {quote.nights}{" "}
              {quote.nights === 1
                ? "noite"
                : "noites"}
            </p>
          </div>

          <div className="mt-5 space-y-3 text-zinc-700">
            <div className="flex justify-between gap-4">
              <span>
                Hóspedes
              </span>

              <strong>
                {guestCount}
              </strong>
            </div>

            <div className="flex justify-between gap-4">
              <span>
                Hospedagem
              </span>

              <strong>
                {formatCurrency(
                  quote.accommodationSubtotal
                )}
              </strong>
            </div>

            <div className="flex justify-between gap-4">
              <span>
                Taxa de limpeza
              </span>

              <strong>
                {formatCurrency(
                  quote.cleaningFee
                )}
              </strong>
            </div>

            <div className="flex justify-between gap-4">
              <span>
                Mínimo exigido
              </span>

              <strong>
                {
                  quote.requiredMinimumNights
                }{" "}
                {quote.requiredMinimumNights ===
                1
                  ? "noite"
                  : "noites"}
              </strong>
            </div>
          </div>

          {!quote.minimumNightsMet && (
            <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-900">
              Esse período não atende ao mínimo
              de{" "}
              {
                quote.requiredMinimumNights
              }{" "}
              noites. Escolha uma estadia maior.
            </div>
          )}

          {quote.minimumNightsMet && (
            <a
              href={createWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex w-full items-center justify-center rounded-full bg-green-900 px-6 py-4 text-center font-bold !text-white transition hover:bg-green-950"
            >
              Consultar disponibilidade no
              WhatsApp
            </a>
          )}

          <p className="mt-4 text-center text-xs leading-5 text-zinc-500">
            Valor estimado sujeito à confirmação
            da disponibilidade e das condições da
            reserva. Nenhuma reserva é realizada
            automaticamente pelo site.
          </p>
        </div>
      )}
    </section>
  );
}