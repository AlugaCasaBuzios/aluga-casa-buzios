"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

function getTextValue(
  formData: FormData,
  fieldName: string
): string {
  const value =
    formData.get(fieldName);

  return typeof value === "string"
    ? value.trim()
    : "";
}

function parseNumberValue(
  value: string
): number {
  return Number(
    value.replace(",", ".")
  );
}

function isDateOnly(
  value: string
): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value
  );
}

export async function updateSpecialPricingRule(
  formData: FormData
): Promise<void> {
  const id =
    getTextValue(
      formData,
      "id"
    );

  const name =
    getTextValue(
      formData,
      "name"
    );

  const startDate =
    getTextValue(
      formData,
      "startDate"
    );

  const endDate =
    getTextValue(
      formData,
      "endDate"
    );

  const multiplier =
    parseNumberValue(
      getTextValue(
        formData,
        "multiplier"
      )
    );

  const minimumNights =
    Number(
      getTextValue(
        formData,
        "minimumNights"
      )
    );

  const priority =
    Number(
      getTextValue(
        formData,
        "priority"
      )
    );

  const label =
    getTextValue(
      formData,
      "label"
    );

  const active =
    formData.get("active") === "on";

  if (!id) {
    redirect(
      "/admin/periodos?erro=id"
    );
  }

  if (!name) {
    redirect(
      `/admin/periodos/${id}?erro=nome`
    );
  }

  if (
    !isDateOnly(startDate) ||
    !isDateOnly(endDate)
  ) {
    redirect(
      `/admin/periodos/${id}?erro=datas`
    );
  }

  if (endDate < startDate) {
    redirect(
      `/admin/periodos/${id}?erro=periodo`
    );
  }

  if (
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    redirect(
      `/admin/periodos/${id}?erro=multiplicador`
    );
  }

  if (
    !Number.isInteger(minimumNights) ||
    minimumNights < 1
  ) {
    redirect(
      `/admin/periodos/${id}?erro=noites`
    );
  }

  if (
    !Number.isInteger(priority) ||
    priority < 0
  ) {
    redirect(
      `/admin/periodos/${id}?erro=prioridade`
    );
  }

  if (!label) {
    redirect(
      `/admin/periodos/${id}?erro=categoria`
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
    .from("special_pricing_rules")
    .update({
      name,
      start_date: startDate,
      end_date: endDate,
      multiplier,
      minimum_nights:
        minimumNights,
      priority,
      label,
      active,
    })
    .eq("id", id);

  if (error) {
    console.error(
      "Erro ao atualizar período especial:",
      error
    );

    redirect(
      `/admin/periodos/${id}?erro=salvar`
    );
  }

  revalidatePath(
    "/admin/periodos"
  );

  revalidatePath(
    `/admin/periodos/${id}`
  );

  redirect(
    "/admin/periodos?salvo=1"
  );
}