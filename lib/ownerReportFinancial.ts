export const SERVICE_PLANS = [
  "full",
  "basic",
  "referral",
  "custom",
] as const;

export type ServicePlan =
  (typeof SERVICE_PLANS)[number];

export type FinancialEntryForReport = {
  entry_type: string;
  category: string;
  amount: number | string | null;
  deduct_from_owner: boolean;
};

export type OwnerReportFinancialResult = {
  grossRevenue: number;
  totalExpenses: number;
  cleaningTotal: number;
  commissionBase: number;
  commissionPercentage: number;
  commissionAmount: number;
  reimbursableExpenses: number;
  ownerPaidExpenses: number;
  amountDueToManager: number;
  netOwnerAmount: number;
};

const DEFAULT_COMMISSION_PERCENTAGES: Record<
  ServicePlan,
  number
> = {
  full: 20,
  basic: 15,
  referral: 10,
  custom: 0,
};

function normalizeText(
  value: string
): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function roundCurrency(
  value: number
): number {
  return (
    Math.round(
      (value + Number.EPSILON) * 100
    ) / 100
  );
}

export function isServicePlan(
  value: string
): value is ServicePlan {
  return SERVICE_PLANS.includes(
    value as ServicePlan
  );
}

export function getServicePlanLabel(
  servicePlan: ServicePlan
): string {
  switch (servicePlan) {
    case "full":
      return "Gerenciamento completo";

    case "basic":
      return "Gerenciamento básico";

    case "referral":
      return "Indicação de cliente";

    case "custom":
      return "Plano personalizado";
  }
}

export function getDefaultCommissionPercentage(
  servicePlan: ServicePlan
): number {
  return DEFAULT_COMMISSION_PERCENTAGES[
    servicePlan
  ];
}

export function resolveCommissionPercentage(
  servicePlan: ServicePlan,
  informedPercentage:
    | number
    | string
    | null
    | undefined
): number {
  if (servicePlan !== "custom") {
    return getDefaultCommissionPercentage(
      servicePlan
    );
  }

  const numericValue =
    Number(informedPercentage ?? 0);

  if (
    !Number.isFinite(numericValue) ||
    numericValue < 0
  ) {
    return 0;
  }

  return roundCurrency(
    Math.min(numericValue, 100)
  );
}

export function isCleaningCategory(
  category: string
): boolean {
  const normalizedCategory =
    normalizeText(category);

  return (
    normalizedCategory.includes(
      "faxina"
    ) ||
    normalizedCategory.includes(
      "limpeza"
    ) ||
    normalizedCategory.includes(
      "diarista"
    )
  );
}

export function calculateOwnerReportFinancial(
  entries: FinancialEntryForReport[],
  commissionPercentageInput:
    | number
    | string
    | null
    | undefined
): OwnerReportFinancialResult {
  const commissionPercentage =
    Number(commissionPercentageInput ?? 0);

  const safeCommissionPercentage =
    Number.isFinite(
      commissionPercentage
    )
      ? Math.min(
          Math.max(
            commissionPercentage,
            0
          ),
          100
        )
      : 0;

  let grossRevenue = 0;
  let totalExpenses = 0;
  let cleaningTotal = 0;
  let reimbursableExpenses = 0;

  for (const entry of entries) {
    const amount =
      Number(entry.amount ?? 0);

    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      continue;
    }

    if (
      entry.entry_type ===
      "revenue"
    ) {
      grossRevenue += amount;
      continue;
    }

    if (
      entry.entry_type !==
      "expense"
    ) {
      continue;
    }

    totalExpenses += amount;

    const isCleaning =
      isCleaningCategory(
        entry.category
      );

    if (isCleaning) {
      /*
       * A faxina é paga diretamente
       * pelo proprietário.
       *
       * Ela reduz a base da comissão,
       * mas não será cobrada novamente
       * no valor devido à gestão.
       */
      cleaningTotal += amount;
      continue;
    }

    if (
      entry.deduct_from_owner
    ) {
      /*
       * Indica uma despesa que foi
       * paga pela gestão e precisa
       * ser reembolsada pelo
       * proprietário.
       */
      reimbursableExpenses +=
        amount;
    }
  }

  const ownerPaidExpenses =
    totalExpenses -
    reimbursableExpenses;

  const commissionBase =
    Math.max(
      grossRevenue -
        cleaningTotal,
      0
    );

  const commissionAmount =
    commissionBase *
    (safeCommissionPercentage /
      100);

  const amountDueToManager =
    commissionAmount +
    reimbursableExpenses;

  /*
   * Resultado econômico final do
   * proprietário após todas as
   * despesas e a comissão.
   *
   * As faxinas são subtraídas apenas
   * uma vez, pois já fazem parte do
   * total de despesas.
   */
  const netOwnerAmount =
    grossRevenue -
    totalExpenses -
    commissionAmount;

  return {
    grossRevenue:
      roundCurrency(
        grossRevenue
      ),

    totalExpenses:
      roundCurrency(
        totalExpenses
      ),

    cleaningTotal:
      roundCurrency(
        cleaningTotal
      ),

    commissionBase:
      roundCurrency(
        commissionBase
      ),

    commissionPercentage:
      roundCurrency(
        safeCommissionPercentage
      ),

    commissionAmount:
      roundCurrency(
        commissionAmount
      ),

    reimbursableExpenses:
      roundCurrency(
        reimbursableExpenses
      ),

    ownerPaidExpenses:
      roundCurrency(
        ownerPaidExpenses
      ),

    amountDueToManager:
      roundCurrency(
        amountDueToManager
      ),

    netOwnerAmount:
      roundCurrency(
        netOwnerAmount
      ),
  };
}