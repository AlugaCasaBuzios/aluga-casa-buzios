"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabaseServer";

function parseNumber(
  value: FormDataEntryValue | null
): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value
    .trim()
    .replace(",", ".");

  if (!normalizedValue) {
    return null;
  }

  const numberValue = Number(normalizedValue);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return numberValue;
}

export async function updatePropertyPricing(
  formData: FormData
) {
  const propertyId = String(
    formData.get("propertyId") ?? ""
  ).trim();

  if (!propertyId) {
    redirect("/admin?erro=imovel");
  }

  const basePrice = parseNumber(
    formData.get("basePrice")
  );

  const cleaningFee = parseNumber(
    formData.get("cleaningFee")
  );

  const minimumNights = parseNumber(
    formData.get("minimumNights")
  );

  const minimumPrice = parseNumber(
    formData.get("minimumPrice")
  );

  const maximumPrice = parseNumber(
    formData.get("maximumPrice")
  );

  const active =
    formData.get("active") === "on";

  const editPage =
    `/admin/imoveis/${encodeURIComponent(propertyId)}`;

  if (
    basePrice === null ||
    basePrice <= 0
  ) {
    redirect(
      `${editPage}?erro=preco-base`
    );
  }

  if (
    cleaningFee !== null &&
    cleaningFee < 0
  ) {
    redirect(
      `${editPage}?erro=limpeza`
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
      `${editPage}?erro=minimo-noites`
    );
  }

  if (
    minimumPrice !== null &&
    minimumPrice <= 0
  ) {
    redirect(
      `${editPage}?erro=preco-minimo`
    );
  }

  if (
    maximumPrice !== null &&
    maximumPrice <= 0
  ) {
    redirect(
      `${editPage}?erro=preco-maximo`
    );
  }

  if (
    minimumPrice !== null &&
    maximumPrice !== null &&
    minimumPrice > maximumPrice
  ) {
    redirect(
      `${editPage}?erro=intervalo`
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
    .from("property_pricing")
    .update({
      base_price: basePrice,
      cleaning_fee: cleaningFee,
      minimum_nights: minimumNights,
      minimum_price: minimumPrice,
      maximum_price: maximumPrice,
      active,
    })
    .eq("property_id", propertyId);

  if (error) {
    redirect(
      `${editPage}?erro=salvar`
    );
  }

  revalidatePath("/admin");
  revalidatePath(editPage);

  redirect("/admin?salvo=1");
}