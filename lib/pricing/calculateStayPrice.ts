import {
  calculateDynamicPrice,
  type DynamicPriceResult,
} from "@/lib/pricing/calculateDynamicPrice";

import type {
  SpecialPricingRule,
} from "@/app/data/specialPricing";

export interface StayPriceInput {
  /**
   * Datas no formato YYYY-MM-DD.
   *
   * O check-in entra no cálculo.
   * O check-out não é cobrado como diária.
   */
  checkIn: string;
  checkOut: string;

  basePrice: number;
  cleaningFee?: number;

  /**
   * Mínimo padrão de noites definido
   * no painel administrativo.
   */
  defaultMinimumNights?: number;

  /**
   * Limites absolutos definidos
   * no painel administrativo.
   */
  minimumPrice?: number;
  maximumPrice?: number;

  /**
   * Regras de períodos especiais carregadas
   * do Supabase.
   *
   * Quando não informadas, o cálculo utiliza
   * as regras locais de segurança.
   */
  specialPricingRules?: SpecialPricingRule[];

  /**
   * Data usada para calcular antecedência.
   * Quando não informada, será usada a data atual.
   */
  referenceDate?: string;

  /**
   * Ocupação mensal por ano e mês.
   *
   * Exemplo:
   * {
   *   "2026-12": 0.80,
   *   "2027-01": 0.65
   * }
   */
  monthlyOccupancy?: Record<
    string,
    number
  >;

  /**
   * Datas que representam pequenos intervalos
   * vazios entre duas reservas.
   */
  orphanGapDates?: string[];

  /**
   * Preços manuais por data.
   *
   * Exemplo:
   * {
   *   "2026-12-31": 2500
   * }
   */
  manualPrices?: Record<
    string,
    number
  >;

  /**
   * Mínimo de noites manual por data.
   */
  manualMinimumNights?: Record<
    string,
    number
  >;
}

export interface StayNightPrice {
  date: string;
  price: number;
  minimumNights: number;
  calculation: DynamicPriceResult;
}

export interface StayPriceResult {
  checkIn: string;
  checkOut: string;

  nights: number;
  requiredMinimumNights: number;
  minimumNightsMet: boolean;

  nightlyPrices: StayNightPrice[];

  accommodationSubtotal: number;
  cleaningFee: number;
  total: number;
}

function parseDateOnly(
  date: string
): Date {
  const datePattern =
    /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(date)) {
    throw new Error(
      `Data inválida: "${date}". Use o formato YYYY-MM-DD.`
    );
  }

  const [year, month, day] = date
    .split("-")
    .map(Number);

  const parsedDate = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  if (
    parsedDate.getUTCFullYear() !==
      year ||
    parsedDate.getUTCMonth() !==
      month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new Error(
      `Data inexistente: "${date}".`
    );
  }

  return parsedDate;
}

function formatDateOnly(
  date: Date
): string {
  const year =
    date.getUTCFullYear();

  const month = String(
    date.getUTCMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getUTCDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(
  date: Date,
  numberOfDays: number
): Date {
  const nextDate = new Date(date);

  nextDate.setUTCDate(
    nextDate.getUTCDate() +
      numberOfDays
  );

  return nextDate;
}

function differenceInDays(
  laterDate: Date,
  earlierDate: Date
): number {
  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  return Math.round(
    (
      laterDate.getTime() -
      earlierDate.getTime()
    ) / millisecondsPerDay
  );
}

function getMonthKey(
  date: string
): string {
  return date.slice(0, 7);
}

export function calculateStayPrice({
  checkIn,
  checkOut,
  basePrice,
  cleaningFee = 0,
  defaultMinimumNights,
  minimumPrice,
  maximumPrice,
  specialPricingRules,
  referenceDate,
  monthlyOccupancy = {},
  orphanGapDates = [],
  manualPrices = {},
  manualMinimumNights = {},
}: StayPriceInput): StayPriceResult {
  const checkInDate =
    parseDateOnly(checkIn);

  const checkOutDate =
    parseDateOnly(checkOut);

  const nights =
    differenceInDays(
      checkOutDate,
      checkInDate
    );

  if (nights <= 0) {
    throw new Error(
      "O check-out precisa ser posterior ao check-in."
    );
  }

  if (
    !Number.isFinite(cleaningFee) ||
    cleaningFee < 0
  ) {
    throw new Error(
      "A taxa de limpeza não pode ser negativa."
    );
  }

  const orphanGapDateSet =
    new Set(orphanGapDates);

  const nightlyPrices:
    StayNightPrice[] = [];

  for (
    let nightIndex = 0;
    nightIndex < nights;
    nightIndex += 1
  ) {
    const currentDate =
      formatDateOnly(
        addDays(
          checkInDate,
          nightIndex
        )
      );

    const monthKey =
      getMonthKey(currentDate);

    const calculation =
      calculateDynamicPrice({
        date: currentDate,
        basePrice,

        monthlyOccupancy:
          monthlyOccupancy[
            monthKey
          ] ?? 0,

        isOrphanGap:
          orphanGapDateSet.has(
            currentDate
          ),

        referenceDate,

        manualPrice:
          manualPrices[
            currentDate
          ],

        manualMinimumNights:
          manualMinimumNights[
            currentDate
          ],

        defaultMinimumNights,
        minimumPrice,
        maximumPrice,
        specialPricingRules,
      });

    nightlyPrices.push({
      date: currentDate,
      price:
        calculation.finalPrice,
      minimumNights:
        calculation.minimumNights,
      calculation,
    });
  }

  const accommodationSubtotal =
    nightlyPrices.reduce(
      (total, night) =>
        total + night.price,
      0
    );

  const requiredMinimumNights =
    Math.max(
      1,
      ...nightlyPrices.map(
        (night) =>
          night.minimumNights
      )
    );

  const normalizedCleaningFee =
    Math.round(cleaningFee);

  return {
    checkIn,
    checkOut,
    nights,
    requiredMinimumNights,

    minimumNightsMet:
      nights >=
      requiredMinimumNights,

    nightlyPrices,
    accommodationSubtotal,

    cleaningFee:
      normalizedCleaningFee,

    total:
      accommodationSubtotal +
      normalizedCleaningFee,
  };
}