export interface SpecialPricingRule {
  id: string;
  name: string;

  /**
   * Datas no formato YYYY-MM-DD.
   * O primeiro e o último dia fazem parte do período.
   */
  startDate: string;
  endDate: string;

  /**
   * Multiplicador aplicado ao preço-base.
   *
   * 1.35 = acréscimo de 35%
   * 1.60 = acréscimo de 60%
   * 2.20 = acréscimo de 120%
   */
  multiplier: number;

  minimumNights: number;

  /**
   * Quando duas regras atingem a mesma data,
   * prevalece a regra com maior prioridade.
   */
  priority: number;

  label: string;
}

export const specialPricingRules: SpecialPricingRule[] = [
  {
    id: "independencia-2026",
    name: "Feriado da Independência",
    startDate: "2026-09-05",
    endDate: "2026-09-07",
    multiplier: 1.35,
    minimumNights: 3,
    priority: 10,
    label: "Feriado",
  },

  {
    id: "aparecida-2026",
    name: "Nossa Senhora Aparecida",
    startDate: "2026-10-10",
    endDate: "2026-10-12",
    multiplier: 1.35,
    minimumNights: 3,
    priority: 10,
    label: "Feriado",
  },

  {
    id: "finados-2026",
    name: "Feriado de Finados",
    startDate: "2026-10-31",
    endDate: "2026-11-02",
    multiplier: 1.35,
    minimumNights: 3,
    priority: 10,
    label: "Feriado",
  },

  {
    id: "consciencia-negra-2026",
    name: "Consciência Negra",
    startDate: "2026-11-20",
    endDate: "2026-11-22",
    multiplier: 1.35,
    minimumNights: 3,
    priority: 10,
    label: "Feriado",
  },

  {
    id: "natal-2026",
    name: "Natal em Búzios",
    startDate: "2026-12-21",
    endDate: "2026-12-27",
    multiplier: 1.6,
    minimumNights: 4,
    priority: 30,
    label: "Natal",
  },

  {
    id: "reveillon-2027",
    name: "Réveillon em Búzios",
    startDate: "2026-12-28",
    endDate: "2027-01-04",
    multiplier: 2.2,
    minimumNights: 6,
    priority: 100,
    label: "Réveillon",
  },

  {
    id: "alta-temporada-janeiro-2027",
    name: "Alta temporada de janeiro",
    startDate: "2027-01-05",
    endDate: "2027-01-31",
    multiplier: 1.4,
    minimumNights: 3,
    priority: 20,
    label: "Alta temporada",
  },

  {
    id: "carnaval-2027",
    name: "Carnaval em Búzios",
    startDate: "2027-02-05",
    endDate: "2027-02-10",
    multiplier: 1.9,
    minimumNights: 5,
    priority: 90,
    label: "Carnaval",
  },
];