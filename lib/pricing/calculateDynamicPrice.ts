import {
  dynamicPricingSettings,
} from "@/app/data/dynamicPricing";

import {
  specialPricingRules as localSpecialPricingRules,
  type SpecialPricingRule,
} from "@/app/data/specialPricing";

export interface PriceAdjustment {
  type:
    | "weekday"
    | "special-period"
    | "last-minute"
    | "advance-booking"
    | "occupancy"
    | "orphan-gap"
    | "minimum-limit"
    | "maximum-limit"
    | "manual";

  label: string;
  multiplier?: number;
  valueBefore: number;
  valueAfter: number;
}

export interface DynamicPriceInput {
  /**
   * Data da diária no formato YYYY-MM-DD.
   */
  date: string;

  /**
   * Preço-base cadastrado no imóvel.
   */
  basePrice: number;

  /**
   * Ocupação do mês.
   * Exemplo: 0.70 representa 70%.
   */
  monthlyOccupancy?: number;

  /**
   * Indica se a data faz parte de um pequeno
   * espaço vazio entre duas reservas.
   */
  isOrphanGap?: boolean;

  /**
   * Data usada para calcular a antecedência.
   * Quando não informada, utiliza a data atual.
   */
  referenceDate?: string;

  /**
   * Preço manual definido pelo administrador.
   * Quando informado, substitui os cálculos.
   */
  manualPrice?: number;

  /**
   * Mínimo de noites definido manualmente
   * para uma data específica.
   */
  manualMinimumNights?: number;

  /**
   * Mínimo padrão de noites definido no painel.
   */
  defaultMinimumNights?: number;

  /**
   * Limite mínimo absoluto definido no painel.
   */
  minimumPrice?: number;

  /**
   * Limite máximo absoluto definido no painel.
   */
  maximumPrice?: number;

  /**
   * Regras especiais carregadas do Supabase.
   * Quando não informadas, utiliza as regras locais.
   */
  specialPricingRules?: SpecialPricingRule[];
}

export interface DynamicPriceResult {
  date: string;
  basePrice: number;
  finalPrice: number;
  minimumNights: number;

  specialRule: SpecialPricingRule | null;

  daysBeforeCheckIn: number;
  monthlyOccupancy: number;

  isManualPrice: boolean;
  adjustments: PriceAdjustment[];
}

function parseDateOnly(date: string): Date {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(date)) {
    throw new Error(
      `Data inválida: "${date}". Use o formato YYYY-MM-DD.`
    );
  }

  const [year, month, day] = date
    .split("-")
    .map(Number);

  const parsedDate = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new Error(
      `Data inexistente: "${date}".`
    );
  }

  return parsedDate;
}

function formatDateOnly(date: Date): string {
  const year = date.getUTCFullYear();

  const month = String(
    date.getUTCMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getUTCDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayDateOnly(): string {
  const now = new Date();

  return formatDateOnly(
    new Date(
      Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      )
    )
  );
}

function differenceInCalendarDays(
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

function roundPrice(
  value: number,
  roundTo: number
): number {
  if (roundTo <= 0) {
    return Math.round(value);
  }

  return (
    Math.round(value / roundTo) *
    roundTo
  );
}

function applyMultiplier(
  currentPrice: number,
  multiplier: number,
  adjustment: Omit<
    PriceAdjustment,
    "multiplier" |
      "valueBefore" |
      "valueAfter"
  >,
  adjustments: PriceAdjustment[]
): number {
  const nextPrice =
    currentPrice * multiplier;

  adjustments.push({
    ...adjustment,
    multiplier,
    valueBefore: currentPrice,
    valueAfter: nextPrice,
  });

  return nextPrice;
}

function findSpecialRule(
  date: string,
  rules: SpecialPricingRule[]
): SpecialPricingRule | null {
  const matchingRules = rules
    .filter(
      (rule) =>
        date >= rule.startDate &&
        date <= rule.endDate
    )
    .sort(
      (firstRule, secondRule) =>
        secondRule.priority -
        firstRule.priority
    );

  return matchingRules[0] ?? null;
}

function getWeekdayLabel(
  weekday: number
): string {
  const labels: Record<number, string> = {
    0: "Domingo",
    1: "Segunda-feira",
    2: "Terça-feira",
    3: "Quarta-feira",
    4: "Quinta-feira",
    5: "Sexta-feira",
    6: "Sábado",
  };

  return labels[weekday] ?? "Dia da semana";
}

export function calculateDynamicPrice({
  date,
  basePrice,
  monthlyOccupancy = 0,
  isOrphanGap = false,
  referenceDate = getTodayDateOnly(),
  manualPrice,
  manualMinimumNights,
  defaultMinimumNights,
  minimumPrice,
  maximumPrice,
  specialPricingRules =
    localSpecialPricingRules,
}: DynamicPriceInput): DynamicPriceResult {
  if (
    !Number.isFinite(basePrice) ||
    basePrice <= 0
  ) {
    throw new Error(
      "O preço-base precisa ser maior que zero."
    );
  }

  const targetDate =
    parseDateOnly(date);

  const comparisonDate =
    parseDateOnly(referenceDate);

  const daysBeforeCheckIn =
    differenceInCalendarDays(
      targetDate,
      comparisonDate
    );

  const normalizedOccupancy = Math.min(
    Math.max(monthlyOccupancy, 0),
    1
  );

  const specialRule =
    findSpecialRule(
      date,
      specialPricingRules
    );

  const adjustments: PriceAdjustment[] =
    [];

  const configuredMinimumNights =
    defaultMinimumNights !== undefined &&
    Number.isInteger(defaultMinimumNights) &&
    defaultMinimumNights > 0
      ? defaultMinimumNights
      : 1;

  /*
   * O mínimo da data especial prevalece quando
   * for maior que o mínimo padrão do imóvel.
   */
  let minimumNights = Math.max(
    specialRule?.minimumNights ?? 1,
    configuredMinimumNights
  );

  /*
   * O mínimo manual por data possui prioridade.
   */
  if (
    manualMinimumNights !== undefined &&
    Number.isFinite(manualMinimumNights) &&
    manualMinimumNights > 0
  ) {
    minimumNights = Math.floor(
      manualMinimumNights
    );
  }

  /*
   * O preço manual substitui todas as regras
   * de cálculo automático.
   */
  if (
    manualPrice !== undefined &&
    Number.isFinite(manualPrice) &&
    manualPrice > 0
  ) {
    adjustments.push({
      type: "manual",
      label: "Preço definido manualmente",
      valueBefore: basePrice,
      valueAfter: manualPrice,
    });

    return {
      date,
      basePrice,
      finalPrice: manualPrice,
      minimumNights,
      specialRule,
      daysBeforeCheckIn,
      monthlyOccupancy:
        normalizedOccupancy,
      isManualPrice: true,
      adjustments,
    };
  }

  /*
   * Caso o preço dinâmico esteja desativado,
   * retorna somente o preço-base.
   */
  if (!dynamicPricingSettings.enabled) {
    return {
      date,
      basePrice,
      finalPrice: basePrice,
      minimumNights,
      specialRule,
      daysBeforeCheckIn,
      monthlyOccupancy:
        normalizedOccupancy,
      isManualPrice: false,
      adjustments,
    };
  }

  let calculatedPrice = basePrice;

  /*
   * Em datas especiais, o multiplicador do
   * evento substitui o ajuste do dia da semana.
   */
  if (specialRule) {
    calculatedPrice = applyMultiplier(
      calculatedPrice,
      specialRule.multiplier,
      {
        type: "special-period",
        label: specialRule.name,
      },
      adjustments
    );
  } else {
    const weekday =
      targetDate.getUTCDay();

    const weekdayMultiplier =
      dynamicPricingSettings
        .weekdayMultipliers[weekday] ?? 1;

    calculatedPrice = applyMultiplier(
      calculatedPrice,
      weekdayMultiplier,
      {
        type: "weekday",
        label: getWeekdayLabel(weekday),
      },
      adjustments
    );
  }

  /*
   * Ajustes de antecedência.
   * Última hora e reserva antecipada
   * são mutuamente exclusivos.
   */
  if (daysBeforeCheckIn >= 0) {
    const lastMinuteRule =
      [
        ...dynamicPricingSettings
          .lastMinuteRules,
      ]
        .sort(
          (firstRule, secondRule) =>
            firstRule
              .maximumDaysBeforeCheckIn -
            secondRule
              .maximumDaysBeforeCheckIn
        )
        .find(
          (rule) =>
            daysBeforeCheckIn <=
            rule.maximumDaysBeforeCheckIn
        );

    if (lastMinuteRule) {
      calculatedPrice = applyMultiplier(
        calculatedPrice,
        lastMinuteRule.multiplier,
        {
          type: "last-minute",
          label: lastMinuteRule.label,
        },
        adjustments
      );
    } else {
      const advanceBookingRule =
        [
          ...dynamicPricingSettings
            .advanceBookingRules,
        ]
          .sort(
            (firstRule, secondRule) =>
              secondRule
                .minimumDaysBeforeCheckIn -
              firstRule
                .minimumDaysBeforeCheckIn
          )
          .find(
            (rule) =>
              daysBeforeCheckIn >=
              rule.minimumDaysBeforeCheckIn
          );

      if (advanceBookingRule) {
        calculatedPrice = applyMultiplier(
          calculatedPrice,
          advanceBookingRule.multiplier,
          {
            type: "advance-booking",
            label:
              advanceBookingRule.label,
          },
          adjustments
        );
      }
    }
  }

  /*
   * Ajuste conforme a ocupação mensal.
   */
  const occupancyRule =
    [
      ...dynamicPricingSettings
        .occupancyRules,
    ]
      .sort(
        (firstRule, secondRule) =>
          secondRule.minimumOccupancy -
          firstRule.minimumOccupancy
      )
      .find(
        (rule) =>
          normalizedOccupancy >=
          rule.minimumOccupancy
      );

  if (occupancyRule) {
    calculatedPrice = applyMultiplier(
      calculatedPrice,
      occupancyRule.multiplier,
      {
        type: "occupancy",
        label: occupancyRule.label,
      },
      adjustments
    );
  }

  /*
   * Ajuste para pequenos espaços
   * vazios entre reservas.
   */
  if (isOrphanGap) {
    calculatedPrice = applyMultiplier(
      calculatedPrice,
      dynamicPricingSettings
        .orphanGapRule.multiplier,
      {
        type: "orphan-gap",
        label:
          dynamicPricingSettings
            .orphanGapRule.label,
      },
      adjustments
    );
  }

  /*
   * Usa os limites absolutos do painel quando
   * estiverem preenchidos. Caso contrário,
   * utiliza os multiplicadores padrão.
   */
  const calculatedMinimumPrice =
    minimumPrice !== undefined &&
    Number.isFinite(minimumPrice) &&
    minimumPrice > 0
      ? minimumPrice
      : basePrice *
        dynamicPricingSettings
          .minimumPriceMultiplier;

  const calculatedMaximumPrice =
    maximumPrice !== undefined &&
    Number.isFinite(maximumPrice) &&
    maximumPrice > 0
      ? maximumPrice
      : basePrice *
        dynamicPricingSettings
          .maximumPriceMultiplier;

  if (
    calculatedMinimumPrice >
    calculatedMaximumPrice
  ) {
    throw new Error(
      "O preço mínimo não pode ser maior que o preço máximo."
    );
  }

  if (
    calculatedPrice <
    calculatedMinimumPrice
  ) {
    adjustments.push({
      type: "minimum-limit",
      label: "Aplicação do preço mínimo",
      valueBefore: calculatedPrice,
      valueAfter:
        calculatedMinimumPrice,
    });

    calculatedPrice =
      calculatedMinimumPrice;
  }

  if (
    calculatedPrice >
    calculatedMaximumPrice
  ) {
    adjustments.push({
      type: "maximum-limit",
      label: "Aplicação do preço máximo",
      valueBefore: calculatedPrice,
      valueAfter:
        calculatedMaximumPrice,
    });

    calculatedPrice =
      calculatedMaximumPrice;
  }

  let finalPrice = roundPrice(
    calculatedPrice,
    dynamicPricingSettings.roundTo
  );

  finalPrice = Math.min(
    Math.max(
      finalPrice,
      calculatedMinimumPrice
    ),
    calculatedMaximumPrice
  );

  return {
    date,
    basePrice,
    finalPrice,
    minimumNights,
    specialRule,
    daysBeforeCheckIn,
    monthlyOccupancy:
      normalizedOccupancy,
    isManualPrice: false,
    adjustments,
  };
}