import "server-only";

import { randomBytes } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export interface IcalExportLink {
  propertyId: string;
  token: string;
  active: boolean;
  createdAt: string;
  rotatedAt: string | null;
  lastFetchedAt: string | null;
}

type IcalExportRow = {
  property_id: string;
  token: string;
  active: boolean;
  created_at: string;
  rotated_at: string | null;
  last_fetched_at: string | null;
};

const SELECT =
  "property_id, token, active, created_at, rotated_at, last_fetched_at";

function mapRow(
  row: IcalExportRow
): IcalExportLink {
  return {
    propertyId: row.property_id,
    token: row.token,
    active: row.active,
    createdAt: row.created_at,
    rotatedAt: row.rotated_at,
    lastFetchedAt: row.last_fetched_at,
  };
}

/**
 * 32 bytes aleatórios (256 bits) em hexadecimal.
 */
export function createIcalToken(): string {
  return randomBytes(32).toString("hex");
}

export function buildIcalExportPath(
  propertyId: string,
  token: string
): string {
  return `/api/ical/${encodeURIComponent(
    propertyId
  )}/${token}.ics`;
}

export async function getIcalExport(
  propertyId: string
): Promise<IcalExportLink | null> {
  const supabase =
    createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("property_ical_exports")
    .select(SELECT)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (error) {
    console.error(
      "Erro ao carregar exportação iCal:",
      error.message
    );

    return null;
  }

  return data
    ? mapRow(data as IcalExportRow)
    : null;
}

/**
 * Retorna o link do imóvel, criando-o se
 * ainda não existir (imóveis novos).
 */
export async function ensureIcalExport(
  propertyId: string
): Promise<IcalExportLink | null> {
  const existing =
    await getIcalExport(propertyId);

  if (existing) {
    return existing;
  }

  const supabase =
    createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("property_ical_exports")
    .upsert(
      {
        property_id: propertyId,
        token: createIcalToken(),
      },
      {
        onConflict: "property_id",
        ignoreDuplicates: true,
      }
    )
    .select(SELECT)
    .maybeSingle();

  if (error) {
    console.error(
      "Erro ao criar exportação iCal:",
      error.message
    );

    return null;
  }

  return data
    ? mapRow(data as IcalExportRow)
    : getIcalExport(propertyId);
}

/**
 * Gera um novo token. O link anterior
 * deixa de funcionar imediatamente.
 */
export async function rotateIcalToken(
  propertyId: string
): Promise<boolean> {
  const supabase =
    createSupabaseAdminClient();

  const { error } = await supabase
    .from("property_ical_exports")
    .upsert(
      {
        property_id: propertyId,
        token: createIcalToken(),
        rotated_at:
          new Date().toISOString(),
        active: true,
      },
      {
        onConflict: "property_id",
      }
    );

  if (error) {
    console.error(
      "Erro ao gerar novo link iCal:",
      error.message
    );

    return false;
  }

  return true;
}
