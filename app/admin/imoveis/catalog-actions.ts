"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

export async function setPropertyActive(
  formData: FormData
) {
  const propertyId = String(
    formData.get("propertyId") ?? ""
  ).trim();

  const nextActive =
    String(
      formData.get("nextActive") ?? ""
    ) === "true";

  if (!propertyId) {
    redirect(
      "/admin?erro=imovel"
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

  const adminSupabase =
    createSupabaseAdminClient();

  const {
    data: pricingData,
    error: pricingError,
  } = await adminSupabase
    .from("property_pricing")
    .update({
      active: nextActive,
    })
    .eq(
      "property_id",
      propertyId
    )
    .select("property_id")
    .maybeSingle();

  if (
    pricingError ||
    !pricingData
  ) {
    console.error(
      "Erro ao alterar o status de preços do imóvel:",
      pricingError
    );

    redirect(
      "/admin?erro=status"
    );
  }

  const {
    data: catalogData,
    error: catalogError,
  } = await adminSupabase
    .from("property_catalog")
    .update({
      active: nextActive,
    })
    .eq(
      "id",
      propertyId
    )
    .select("id")
    .maybeSingle();

  if (
    catalogError ||
    !catalogData
  ) {
    console.error(
      "Erro ao alterar o status do imóvel no catálogo:",
      catalogError
    );

    await adminSupabase
      .from("property_pricing")
      .update({
        active: !nextActive,
      })
      .eq(
        "property_id",
        propertyId
      );

    redirect(
      "/admin?erro=status"
    );
  }

  revalidatePath("/");
  revalidatePath("/casas");
  revalidatePath("/admin");
  revalidatePath(
    `/imoveis/${propertyId}`
  );
  revalidatePath("/sitemap.xml");

  redirect(
    nextActive
      ? "/admin?status=reativado"
      : "/admin?status=desativado"
  );
}
