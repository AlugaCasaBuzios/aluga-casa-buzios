"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

function getTextValue(
  formData: FormData,
  fieldName: string
): string {
  const value = formData.get(fieldName);

  return typeof value === "string"
    ? value.trim()
    : "";
}

function isValidDateOnly(
  value: string
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  const parsedDate = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
}

export async function createManualAvailabilityBlock(
  formData: FormData
): Promise<void> {
  const propertyId = getTextValue(
    formData,
    "propertyId"
  );

  const startDate = getTextValue(
    formData,
    "startDate"
  );

  const endDateExclusive = getTextValue(
    formData,
    "endDateExclusive"
  );

  const reason = getTextValue(
    formData,
    "reason"
  );

  const active =
    formData.get("active") === "on";

  if (!propertyId) {
    redirect(
      "/admin/bloqueios/novo?erro=imovel"
    );
  }

  if (
    !isValidDateOnly(startDate) ||
    !isValidDateOnly(endDateExclusive)
  ) {
    redirect(
      "/admin/bloqueios/novo?erro=datas"
    );
  }

  if (endDateExclusive <= startDate) {
    redirect(
      "/admin/bloqueios/novo?erro=periodo"
    );
  }

  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const {
    data: property,
    error: propertyError,
  } = await supabase
    .from("property_pricing")
    .select("property_id")
    .eq("property_id", propertyId)
    .maybeSingle();

  if (propertyError || !property) {
    console.error(
      "Erro ao localizar imóvel:",
      propertyError
    );

    redirect(
      "/admin/bloqueios/novo?erro=imovel"
    );
  }

  /*
   * Evita dois bloqueios ativos cruzando
   * o mesmo período para o mesmo imóvel.
   */
  if (active) {
    const {
      data: conflictingBlocks,
      error: conflictError,
    } = await supabase
      .from("manual_availability_blocks")
      .select("id")
      .eq("property_id", propertyId)
      .eq("active", true)
      .lt("start_date", endDateExclusive)
      .gt("end_date_exclusive", startDate)
      .limit(1);

    if (conflictError) {
      console.error(
        "Erro ao verificar bloqueios existentes:",
        conflictError
      );

      redirect(
        "/admin/bloqueios/novo?erro=verificar"
      );
    }

    if (
      conflictingBlocks &&
      conflictingBlocks.length > 0
    ) {
      redirect(
        "/admin/bloqueios/novo?erro=conflito"
      );
    }
  }

  const { error } = await supabase
    .from("manual_availability_blocks")
    .insert({
      property_id: propertyId,
      start_date: startDate,
      end_date_exclusive:
        endDateExclusive,
      reason:
        reason || null,
      active,
    });

  if (error) {
    console.error(
      "Erro ao cadastrar bloqueio manual:",
      error
    );

    redirect(
      "/admin/bloqueios/novo?erro=salvar"
    );
  }

  revalidatePath(
    "/admin/bloqueios"
  );

  redirect(
    "/admin/bloqueios?criado=1"
  );
}