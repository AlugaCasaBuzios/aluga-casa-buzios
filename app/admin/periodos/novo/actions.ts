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

function parseNumberValue(
  value: string
): number {
  return Number(
    value.replace(",", ".")
  );
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

function createRuleId(
  name: string,
  startDate: string
): string {
  const normalizedName = name
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${normalizedName}-${startDate}`;
}

export async function createSpecialPricingRule(
  formData: FormData
): Promise<void> {
  const name = getTextValue(
    formData,
    "name"
  );

  const startDate = getTextValue(
    formData,
    "startDate"
  );

  const endDate = getTextValue(
    formData,
    "endDate"
  );

  const multiplier = parseNumberValue(
    getTextValue(
      formData,
      "multiplier"
    )
  );

  const minimumNights = Number(
    getTextValue(
      formData,
      "minimumNights"
    )
  );

  const priority = Number(
    getTextValue(
      formData,
      "priority"
    )
  );

  const label = getTextValue(
    formData,
    "label"
  );

  const active =
    formData.get("active") === "on";

  if (!name) {
    redirect(
      "/admin/periodos/novo?erro=nome"
    );
  }

  if (
    !isValidDateOnly(startDate) ||
    !isValidDateOnly(endDate)
  ) {
    redirect(
      "/admin/periodos/novo?erro=datas"
    );
  }

  if (endDate < startDate) {
    redirect(
      "/admin/periodos/novo?erro=periodo"
    );
  }

  if (
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    redirect(
      "/admin/periodos/novo?erro=multiplicador"
    );
  }

  if (
    !Number.isInteger(minimumNights) ||
    minimumNights < 1
  ) {
    redirect(
      "/admin/periodos/novo?erro=noites"
    );
  }

  if (
    !Number.isInteger(priority) ||
    priority < 0
  ) {
    redirect(
      "/admin/periodos/novo?erro=prioridade"
    );
  }

  if (!label) {
    redirect(
      "/admin/periodos/novo?erro=categoria"
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

  const id = createRuleId(
    name,
    startDate
  );

  const { error } = await supabase
    .from("special_pricing_rules")
    .insert({
      id,
      name,
      start_date: startDate,
      end_date: endDate,
      multiplier,
      minimum_nights: minimumNights,
      priority,
      label,
      active,
    });

  if (error) {
    console.error(
      "Erro ao cadastrar período especial:",
      error
    );

    const errorCode =
      error.code === "23505"
        ? "duplicado"
        : "salvar";

    redirect(
      `/admin/periodos/novo?erro=${errorCode}`
    );
  }

  revalidatePath(
    "/admin/periodos"
  );

  redirect(
    "/admin/periodos?criado=1"
  );
}