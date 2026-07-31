export interface LastMinuteRule {
  maximumDaysBeforeCheckIn: number;
  multiplier: number;
  label: string;
}

export interface AdvanceBookingRule {
  minimumDaysBeforeCheckIn: number;
  multiplier: number;
  label: string;
}

export interface OccupancyPricingRule {
  minimumOccupancy: number;
  multiplier: number;
  label: string;
}

export interface OrphanGapRule {
  maximumGapNights: number;
  multiplier: number;
  label: string;
}

export interface DynamicPricingSettings {
  enabled: boolean;

  /**
   * Limites calculados sobre o preço-base do imóvel.
   *
   * 0.7 = nunca cobrar menos que 70% do preço-base.
   * 3 = nunca cobrar mais que 300% do preço-base,
   * exceto quando houver preço manual.
   */
  minimumPriceMultiplier: number;
  maximumPriceMultiplier: number;

  /**
   * Ajustes de acordo com o dia da semana.
   *
   * JavaScript:
   * 0 = domingo
   * 1 = segunda
   * 2 = terça
   * 3 = quarta
   * 4 = quinta
   * 5 = sexta
   * 6 = sábado
   */
  weekdayMultipliers: Record<number, number>;

  lastMinuteRules: LastMinuteRule[];

  advanceBookingRules: AdvanceBookingRule[];

  occupancyRules: OccupancyPricingRule[];

  orphanGapRule: OrphanGapRule;

  /**
   * Arredondamento do preço final.
   *
   * 10 transforma R$ 537 em R$ 540.
   */
  roundTo: number;
}

export const dynamicPricingSettings: DynamicPricingSettings = {
  enabled: true,

  minimumPriceMultiplier: 0.7,
  maximumPriceMultiplier: 3,

  weekdayMultipliers: {
    0: 1.05, // Domingo: +5%
    1: 0.95, // Segunda: -5%
    2: 0.95, // Terça: -5%
    3: 0.95, // Quarta: -5%
    4: 1, // Quinta: preço normal
    5: 1.15, // Sexta: +15%
    6: 1.25, // Sábado: +25%
  },

  lastMinuteRules: [
    {
      maximumDaysBeforeCheckIn: 2,
      multiplier: 0.8,
      label: "Desconto de última hora: até 2 dias",
    },
    {
      maximumDaysBeforeCheckIn: 7,
      multiplier: 0.9,
      label: "Desconto de última hora: até 7 dias",
    },
    {
      maximumDaysBeforeCheckIn: 14,
      multiplier: 0.95,
      label: "Desconto de última hora: até 14 dias",
    },
  ],

  advanceBookingRules: [
    {
      minimumDaysBeforeCheckIn: 180,
      multiplier: 1.15,
      label: "Reserva com mais de 180 dias de antecedência",
    },
    {
      minimumDaysBeforeCheckIn: 90,
      multiplier: 1.1,
      label: "Reserva com mais de 90 dias de antecedência",
    },
  ],

  occupancyRules: [
    {
      minimumOccupancy: 0.85,
      multiplier: 1.25,
      label: "Ocupação mensal acima de 85%",
    },
    {
      minimumOccupancy: 0.7,
      multiplier: 1.15,
      label: "Ocupação mensal acima de 70%",
    },
    {
      minimumOccupancy: 0.5,
      multiplier: 1.05,
      label: "Ocupação mensal acima de 50%",
    },
  ],

  orphanGapRule: {
    maximumGapNights: 2,
    multiplier: 0.85,
    label: "Desconto para preencher intervalo entre reservas",
  },

  roundTo: 10,
};