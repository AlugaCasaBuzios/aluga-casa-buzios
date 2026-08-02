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

export async function updateManualAvailabilityBlock(
  formData: FormData
): Promise<void> {
  const id = getTextValue(
    formData,
    "id"
  );

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

  if (!id) {
    redirect(
      "/admin/bloqueios?erro=id"
    );
  }

  if (!propertyId) {
    redirect(
      `/admin/bloqueios/${id}?erro=imovel`
    );
  }

  if (
    !isValidDateOnly(startDate) ||
    !isValidDateOnly(endDateExclusive)
  ) {
    redirect(
      `/admin/bloqueios/${id}?erro=datas`
    );
  }

  if (endDateExclusive <= startDate) {
    redirect(
      `/admin/bloqueios/${id}?erro=periodo`
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
      `/admin/bloqueios/${id}?erro=imovel`
    );
  }

  /*
   * Verifica se o período atualizado cruza
   * outro bloqueio ativo do mesmo imóvel.
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
      .neq("id", id)
      .lt("start_date", endDateExclusive)
      .gt("end_date_exclusive", startDate)
      .limit(1);

    if (conflictError) {
      console.error(
        "Erro ao verificar bloqueios existentes:",
        conflictError
      );

      redirect(
        `/admin/bloqueios/${id}?erro=verificar`
      );
    }

    if (
      conflictingBlocks &&
      conflictingBlocks.length > 0
    ) {
      redirect(
        `/admin/bloqueios/${id}?erro=conflito`
      );
    }
  }

  const { error } = await supabase
    .from("manual_availability_blocks")
    .update({
      property_id: propertyId,
      start_date: startDate,
      end_date_exclusive:
        endDateExclusive,
      reason:
        reason || null,
      active,
    })
    .eq("id", id);

  if (error) {
    console.error(
      "Erro ao atualizar bloqueio manual:",
      error
    );

    redirect(
      `/admin/bloqueios/${id}?erro=salvar`
    );
  }

  revalidatePath(
    "/admin/bloqueios"
  );

  revalidatePath(
    `/admin/bloqueios/${id}`
  );

  redirect(
    "/admin/bloqueios?salvo=1"
  );
}

export async function deleteManualAvailabilityBlock(
  formData: FormData
): Promise<void> {
  const id = getTextValue(
    formData,
    "id"
  );

  if (!id) {
    redirect(
      "/admin/bloqueios?erro=id"
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

  const { error } = await supabase
    .from("manual_availability_blocks")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(
      "Erro ao excluir bloqueio manual:",
      error
    );

    redirect(
      `/admin/bloqueios/${id}?erro=excluir`
    );
  }

  revalidatePath(
    "/admin/bloqueios"
  );

  redirect(
    "/admin/bloqueios?excluido=1"
  );
}