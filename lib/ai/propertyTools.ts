import "server-only";

import type { FunctionTool } from "openai/resources/responses/responses";

import { getPropertyQuote } from "@/lib/pricing/getPropertyQuote";
import {
  getActiveProperties,
  getActivePropertyById,
} from "@/lib/propertyCatalog";

export interface AiToolEvent {
  toolName: string;
  arguments: Record<string, unknown>;
  result: unknown;
  success: boolean;
}

export interface ToolExecutionResult {
  output: Record<string, unknown>;
  handoffRequested: boolean;
  handoffReason?: string;
}

export const propertyTools: FunctionTool[] = [
  {
    type: "function",
    name: "search_properties",
    description:
      "Pesquisa imóveis ativos conforme capacidade, bairro e recursos desejados.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        guests: { type: ["integer", "null"], minimum: 1 },
        bedrooms: { type: ["integer", "null"], minimum: 0 },
        neighborhood: { type: ["string", "null"] },
        pool: { type: ["boolean", "null"] },
        pet_friendly: { type: ["boolean", "null"] },
        max_base_daily_rate: {
          type: ["number", "null"],
          minimum: 1,
          description:
            "Faixa de preço-base; não substitui orçamento para datas específicas.",
        },
      },
      required: [
        "guests",
        "bedrooms",
        "neighborhood",
        "pool",
        "pet_friendly",
        "max_base_daily_rate",
      ],
    },
  },
  {
    type: "function",
    name: "get_property_details",
    description:
      "Obtém detalhes públicos e regras de um imóvel ativo pelo identificador.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        property_id: { type: "string", minLength: 1 },
      },
      required: ["property_id"],
    },
  },
  {
    type: "function",
    name: "get_property_quote",
    description:
      "Consulta bloqueios e calcula o orçamento oficial do site para um imóvel e período.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        property_id: { type: "string", minLength: 1 },
        check_in: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        },
        check_out: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        },
      },
      required: ["property_id", "check_in", "check_out"],
    },
  },
  {
    type: "function",
    name: "request_human_handoff",
    description:
      "Solicita que um atendente humano assuma a conversa.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        reason: { type: "string", minLength: 3, maxLength: 500 },
      },
      required: ["reason"],
    },
  },
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

export async function executePropertyTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolExecutionResult> {
  if (name === "request_human_handoff") {
    const reason = nullableString(args.reason) || "Solicitação do cliente";
    return {
      output: { success: true, handoff_requested: true, reason },
      handoffRequested: true,
      handoffReason: reason,
    };
  }

  if (name === "search_properties") {
    const properties = await getActiveProperties();
    const guests = nullableNumber(args.guests);
    const bedrooms = nullableNumber(args.bedrooms);
    const neighborhood = nullableString(args.neighborhood);
    const pool = nullableBoolean(args.pool);
    const petFriendly = nullableBoolean(args.pet_friendly);
    const maxRate = nullableNumber(args.max_base_daily_rate);

    const matches = properties
      .filter((property) => guests === null || property.guests >= guests)
      .filter(
        (property) => bedrooms === null || property.bedrooms >= bedrooms
      )
      .filter(
        (property) =>
          neighborhood === null ||
          normalize(property.neighborhood).includes(normalize(neighborhood))
      )
      .filter((property) => pool === null || property.pool === pool)
      .filter(
        (property) =>
          petFriendly === null || property.petFriendly === petFriendly
      )
      .filter((property) => maxRate === null || property.price <= maxRate)
      .slice(0, 6)
      .map((property) => ({
        id: property.id,
        title: property.title,
        neighborhood: property.neighborhood,
        guests: property.guests,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        pool: property.pool,
        pet_friendly: property.petFriendly,
        base_daily_rate: property.price,
        page_url: `https://alugacasabuzios.com.br/imoveis/${property.id}`,
      }));

    return {
      output: {
        success: true,
        count: matches.length,
        properties: matches,
        note: "O preço-base é apenas uma referência. Use get_property_quote para datas específicas.",
      },
      handoffRequested: false,
    };
  }

  if (name === "get_property_details") {
    const propertyId = nullableString(args.property_id);
    const property = propertyId
      ? await getActivePropertyById(propertyId)
      : null;

    if (!property) {
      return {
        output: { success: false, error: "Imóvel não encontrado." },
        handoffRequested: false,
      };
    }

    return {
      output: {
        success: true,
        property: {
          id: property.id,
          title: property.title,
          neighborhood: property.neighborhood,
          guests: property.guests,
          bedrooms: property.bedrooms,
          suites: property.suites,
          bathrooms: property.bathrooms,
          beds: property.beds,
          garage: property.garage,
          area: property.area,
          pool: property.pool,
          barbecue: property.barbecue,
          wifi: property.wifi,
          air_conditioning: property.airConditioning,
          kitchen: property.kitchen,
          washing_machine: property.washingMachine,
          pet_friendly: property.petFriendly,
          beach_distance: property.beachDistance,
          check_in: property.checkin,
          check_out: property.checkout,
          description: property.description,
          amenities: property.amenities,
          rules: property.rules,
          rating: property.rating,
          reviews: property.reviews,
          page_url: `https://alugacasabuzios.com.br/imoveis/${property.id}`,
        },
      },
      handoffRequested: false,
    };
  }

  if (name === "get_property_quote") {
    const quote = await getPropertyQuote({
      propertyId: nullableString(args.property_id) || "",
      checkIn: nullableString(args.check_in) || "",
      checkOut: nullableString(args.check_out) || "",
    });

    return {
      output: quote.body,
      handoffRequested: false,
    };
  }

  return {
    output: { success: false, error: "Ferramenta não reconhecida." },
    handoffRequested: true,
    handoffReason: "A IA tentou usar uma ferramenta não reconhecida.",
  };
}
