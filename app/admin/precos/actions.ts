"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { rotateIcalToken } from "@/lib/availability/icalExport";
import { markPricingReviewed } from "@/lib/pricing/markPricingReviewed";

function getPropertyId(
  formData: FormData
): string {
  const value = formData.get("propertyId");

  return typeof value === "string"
    ? value.trim()
    : "";
}

function buildPricesPage(
  propertyId: string
): string {
  return `/admin/precos/${encodeURIComponent(propertyId)}`;
}

/**
 * Botão "Conferi, preços estão iguais ao Airbnb".
 */
export async function confirmPricingReviewed(
  formData: FormData
): Promise<void> {
  const propertyId =
    getPropertyId(formData);

  if (!propertyId) {
    redirect("/admin/precos?erro=imovel");
  }

  const { userId } = await requireAdmin();

  const saved = await markPricingReviewed(
    [propertyId],
    userId
  );

  const page = buildPricesPage(propertyId);

  revalidatePath("/admin/precos");
  revalidatePath(page);

  redirect(
    saved
      ? `${page}?revisado=1`
      : `${page}?erro=revisao`
  );
}

/**
 * Invalida o link iCal atual e gera outro.
 */
export async function regenerateIcalLink(
  formData: FormData
): Promise<void> {
  const propertyId =
    getPropertyId(formData);

  if (!propertyId) {
    redirect("/admin/precos?erro=imovel");
  }

  await requireAdmin();

  const saved =
    await rotateIcalToken(propertyId);

  const page = buildPricesPage(propertyId);

  revalidatePath(page);

  redirect(
    saved
      ? `${page}?ical=novo#ical`
      : `${page}?erro=ical#ical`
  );
}
