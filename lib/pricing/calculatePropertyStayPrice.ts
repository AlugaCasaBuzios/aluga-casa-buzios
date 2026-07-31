import type { Property } from "@/types/Property";

import {
  calculateStayPrice,
  type StayPriceInput,
  type StayPriceResult,
} from "@/lib/pricing/calculateStayPrice";

export interface PropertyStayPriceInput
  extends Omit<
    StayPriceInput,
    "basePrice" | "cleaningFee"
  > {
  /**
   * Imóvel selecionado no properties.ts.
   */
  property: Pick<
    Property,
    "price" | "cleaningFee"
  >;
}

/**
 * Calcula uma hospedagem utilizando automaticamente
 * o preço-base e a taxa de limpeza do imóvel.
 */
export function calculatePropertyStayPrice({
  property,
  ...stayData
}: PropertyStayPriceInput): StayPriceResult {
  if (
    !Number.isFinite(property.price) ||
    property.price <= 0
  ) {
    throw new Error(
      "O imóvel precisa possuir um preço-base maior que zero."
    );
  }

  if (
    !Number.isFinite(property.cleaningFee) ||
    property.cleaningFee < 0
  ) {
    throw new Error(
      "A taxa de limpeza do imóvel não pode ser negativa."
    );
  }

  return calculateStayPrice({
    ...stayData,
    basePrice: property.price,
    cleaningFee: property.cleaningFee,
  });
}