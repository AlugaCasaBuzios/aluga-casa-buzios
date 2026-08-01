import "server-only";

import type { Property } from "@/types/Property";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export interface PropertyPricingConfig {
  basePrice: number;
  cleaningFee: number;
  minimumNights?: number;
  minimumPrice?: number;
  maximumPrice?: number;
  source: "supabase" | "properties";
}

type PropertyPricingRow = {
  base_price: unknown;
  cleaning_fee: unknown;
  minimum_nights: unknown;
  minimum_price: unknown;
  maximum_price: unknown;
};

function toPositiveNumber(
  value: unknown
): number | undefined {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return undefined;
  }

  const parsedValue = Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue <= 0
  ) {
    return undefined;
  }

  return parsedValue;
}

function toNonNegativeNumber(
  value: unknown
): number | undefined {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return undefined;
  }

  const parsedValue = Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < 0
  ) {
    return undefined;
  }

  return parsedValue;
}

function toPositiveInteger(
  value: unknown
): number | undefined {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return undefined;
  }

  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 1
  ) {
    return undefined;
  }

  return parsedValue;
}

function createFallbackPricing(
  property: Pick<
    Property,
    "price" | "cleaningFee"
  >
): PropertyPricingConfig {
  return {
    basePrice: property.price,

    cleaningFee:
      toNonNegativeNumber(
        property.cleaningFee
      ) ?? 0,

    source: "properties",
  };
}

export async function getPropertyPricingConfig(
  property: Pick<
    Property,
    "id" | "price" | "cleaningFee"
  >
): Promise<PropertyPricingConfig> {
  const fallback =
    createFallbackPricing(property);

  try {
    const supabase =
      await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("property_pricing")
      .select(`
        base_price,
        cleaning_fee,
        minimum_nights,
        minimum_price,
        maximum_price
      `)
      .eq("property_id", property.id)
      .eq("active", true)
      .maybeSingle();

    if (error) {
      console.error(
        `Erro do Supabase ao consultar ${property.id}:`,
        {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        }
      );

      return fallback;
    }

    if (!data) {
      console.warn(
        `O imóvel ${property.id} não foi encontrado ou não está ativo no Supabase.`
      );

      return fallback;
    }

    const row =
      data as PropertyPricingRow;

    const basePrice =
      toPositiveNumber(
        row.base_price
      );

    if (basePrice === undefined) {
      console.warn(
        `O preço-base de ${property.id} está inválido no Supabase. Usando properties.ts.`
      );

      return fallback;
    }

    const cleaningFee =
      toNonNegativeNumber(
        row.cleaning_fee
      ) ?? fallback.cleaningFee;

    const minimumNights =
      toPositiveInteger(
        row.minimum_nights
      );

    const minimumPrice =
      toPositiveNumber(
        row.minimum_price
      );

    const maximumPrice =
      toPositiveNumber(
        row.maximum_price
      );

    if (
      minimumPrice !== undefined &&
      maximumPrice !== undefined &&
      minimumPrice > maximumPrice
    ) {
      console.warn(
        `O preço mínimo de ${property.id} é maior que o preço máximo. Usando os limites automáticos.`
      );

      return {
        basePrice,
        cleaningFee,
        minimumNights,
        source: "supabase",
      };
    }

    console.log(
      `Configuração de preços carregada do Supabase para ${property.id}.`
    );

    return {
      basePrice,
      cleaningFee,
      minimumNights,
      minimumPrice,
      maximumPrice,
      source: "supabase",
    };
  } catch (error) {
    console.error(
      `Falha inesperada ao consultar o preço de ${property.id}:`,
      error
    );

    return fallback;
  }
}