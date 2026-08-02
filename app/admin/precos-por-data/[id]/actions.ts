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

function parseOptionalNumber(
  value: string
): number | null {
  if (value === "") {
    return null;
  }

  const parsedValue = Number(
    value.replace(",", ".")
  );

  return Number.isFinite(parsedValue)
    ? parsedValue
    : Number.NaN;
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

export async function updateDatePricingOverride(
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

  const pricingDate = getTextValue(
    formData,
    "pricingDate"
  );

  const manualPrice =
    parseOptionalNumber(
      getTextValue(
        formData,
        "manualPrice"
      )
    );

  const minimumNights =
    parseOptionalNumber(
      getTextValue(
        formData,
        "minimumNights"
      )
    );

  const notes = getTextValue(
    formData,
    "notes"
  );

  const active =
    formData.get("active") === "on";

  if (!id) {
    redirect(
      "/admin/precos-por-data?erro=id"
    );
  }

  if (!propertyId) {
    redirect(
      `/admin/precos-por-data/${id}?erro=imovel`
    );
  }

  if (!isValidDateOnly(pricingDate)) {
    redirect(
      `/admin/precos-por-data/${id}?erro=data`
    );
  }

  if (
    manualPrice !== null &&
    (
      !Number.isFinite(manualPrice) ||
      manualPrice <= 0
    )
  ) {
    redirect(
      `/admin/precos-por-data/${id}?erro=preco`
    );
  }

  if (
    minimumNights !== null &&
    (
      !Number.isInteger(minimumNights) ||
      minimumNights < 1
    )
  ) {
    redirect(
      `/admin/precos-por-data/${id}?erro=noites`
    );
  }

  if (
    manualPrice === null &&
    minimumNights === null
  ) {
    redirect(
      `/admin/precos-por-data/${id}?erro=valores`
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
    .from("date_pricing_overrides")
    .update({
      property_id: propertyId,
      pricing_date: pricingDate,
      manual_price: manualPrice,
      minimum_nights: minimumNights,
      notes: notes || null,
      active,
    })
    .eq("id", id);

  if (error) {
    console.error(
      "Erro ao atualizar preço por data:",
      error
    );

    const errorCode =
      error.code === "23505"
        ? "duplicado"
        : "salvar";

    redirect(
      `/admin/precos-por-data/${id}?erro=${errorCode}`
    );
  }

  revalidatePath(
    "/admin/precos-por-data"
  );

  revalidatePath(
    `/admin/precos-por-data/${id}`
  );

  redirect(
    "/admin/precos-por-data?salvo=1"
  );
}

export async function deleteDatePricingOverride(
  formData: FormData
): Promise<void> {
  const id = getTextValue(
    formData,
    "id"
  );

  if (!id) {
    redirect(
      "/admin/precos-por-data?erro=id"
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
    .from("date_pricing_overrides")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(
      "Erro ao excluir preço por data:",
      error
    );

    redirect(
      `/admin/precos-por-data/${id}?erro=excluir`
    );
  }

  revalidatePath(
    "/admin/precos-por-data"
  );

  redirect(
    "/admin/precos-por-data?excluido=1"
  );
}