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

function parseNumber(
  value: FormDataEntryValue | null
): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function parseInteger(
  value: FormDataEntryValue | null
): number | null {
  const parsed =
    parseNumber(value);

  if (
    parsed === null ||
    !Number.isInteger(parsed)
  ) {
    return null;
  }

  return parsed;
}

function parseLines(
  value: FormDataEntryValue | null
): string[] {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(
  value: string
): string {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

function buildErrorUrl(
  error: string
): string {
  return `/admin/imoveis/novo?erro=${encodeURIComponent(error)}`;
}

export async function createProperty(
  formData: FormData
) {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const typedId = String(
    formData.get("id") ?? ""
  ).trim();

  const propertyId =
    slugify(
      typedId || title
    );

  const neighborhood = String(
    formData.get("neighborhood") ?? ""
  ).trim();

  const address = String(
    formData.get("address") ?? ""
  ).trim();

  const description = String(
    formData.get("description") ?? ""
  ).trim();

  const beachDistance = String(
    formData.get("beachDistance") ?? ""
  ).trim();

  const checkin = String(
    formData.get("checkin") ?? "15:00"
  ).trim();

  const checkout = String(
    formData.get("checkout") ?? "11:00"
  ).trim();

  const image = String(
    formData.get("image") ?? ""
  ).trim();

  const photoUploadStatus = String(
    formData.get("photoUploadStatus") ?? ""
  ).trim();

  const airbnb = String(
    formData.get("airbnb") ?? ""
  ).trim();

  const booking = String(
    formData.get("booking") ?? ""
  ).trim();

  const whatsapp = String(
    formData.get("whatsapp") ?? ""
  ).trim();

  const guests =
    parseInteger(
      formData.get("guests")
    );

  const bedrooms =
    parseInteger(
      formData.get("bedrooms")
    );

  const bathrooms =
    parseNumber(
      formData.get("bathrooms")
    );

  const beds =
    parseInteger(
      formData.get("beds")
    );

  const suites =
    parseInteger(
      formData.get("suites")
    );

  const area =
    parseNumber(
      formData.get("area")
    );

  const garage =
    parseInteger(
      formData.get("garage")
    );

  const rating =
    parseNumber(
      formData.get("rating")
    );

  const reviews =
    parseInteger(
      formData.get("reviews")
    );

  const latitude =
    parseNumber(
      formData.get("latitude")
    );

  const longitude =
    parseNumber(
      formData.get("longitude")
    );

  const displayOrder =
    parseInteger(
      formData.get("displayOrder")
    );

  const basePrice =
    parseNumber(
      formData.get("basePrice")
    );

  const cleaningFee =
    parseNumber(
      formData.get("cleaningFee")
    );

  const minimumNights =
    parseInteger(
      formData.get("minimumNights")
    );

  const minimumPrice =
    parseNumber(
      formData.get("minimumPrice")
    );

  const maximumPrice =
    parseNumber(
      formData.get("maximumPrice")
    );

  if (
    !propertyId ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      propertyId
    )
  ) {
    redirect(
      buildErrorUrl("id")
    );
  }

  if (!title) {
    redirect(
      buildErrorUrl("titulo")
    );
  }

  if (!neighborhood) {
    redirect(
      buildErrorUrl("bairro")
    );
  }

  if (
    guests === null ||
    guests < 1
  ) {
    redirect(
      buildErrorUrl("hospedes")
    );
  }

  const nonNegativeValues = [
    bedrooms,
    bathrooms,
    beds,
    suites,
    area,
    garage,
    reviews,
    displayOrder,
  ];

  if (
    nonNegativeValues.some(
      (value) =>
        value === null ||
        value < 0
    )
  ) {
    redirect(
      buildErrorUrl("numeros")
    );
  }

  if (
    rating === null ||
    rating < 0 ||
    rating > 5
  ) {
    redirect(
      buildErrorUrl("avaliacao")
    );
  }

  if (
    latitude !== null &&
    (
      latitude < -90 ||
      latitude > 90
    )
  ) {
    redirect(
      buildErrorUrl("latitude")
    );
  }

  if (
    longitude !== null &&
    (
      longitude < -180 ||
      longitude > 180
    )
  ) {
    redirect(
      buildErrorUrl("longitude")
    );
  }

  if (
    basePrice === null ||
    basePrice <= 0
  ) {
    redirect(
      buildErrorUrl("preco-base")
    );
  }

  if (
    cleaningFee !== null &&
    cleaningFee < 0
  ) {
    redirect(
      buildErrorUrl("limpeza")
    );
  }

  if (
    minimumNights === null ||
    minimumNights < 1
  ) {
    redirect(
      buildErrorUrl("minimo-noites")
    );
  }

  if (
    minimumPrice !== null &&
    minimumPrice <= 0
  ) {
    redirect(
      buildErrorUrl("preco-minimo")
    );
  }

  if (
    maximumPrice !== null &&
    maximumPrice <= 0
  ) {
    redirect(
      buildErrorUrl("preco-maximo")
    );
  }

  if (
    minimumPrice !== null &&
    maximumPrice !== null &&
    minimumPrice > maximumPrice
  ) {
    redirect(
      buildErrorUrl("intervalo")
    );
  }

  const gallery =
    parseLines(
      formData.get("gallery")
    );

  if (
    photoUploadStatus === "pending"
  ) {
    redirect(
      buildErrorUrl("fotos-pendentes")
    );
  }

  if (
    !image ||
    gallery.length === 0
  ) {
    redirect(
      buildErrorUrl("fotos")
    );
  }

  const amenities =
    parseLines(
      formData.get("amenities")
    );

  const rules =
    parseLines(
      formData.get("rules")
    );

  const keywords =
    parseLines(
      formData.get("keywords")
    );

  const active =
    formData.get("active") === "on";

  const featured =
    formData.get("featured") === "on";

  const adminSupabase =
    createSupabaseAdminClient();

  const {
    data: existingProperty,
    error: existingPropertyError,
  } = await adminSupabase
    .from("property_catalog")
    .select("id")
    .eq("id", propertyId)
    .maybeSingle();

  if (existingPropertyError) {
    console.error(
      "Erro ao verificar imóvel existente:",
      existingPropertyError
    );

    redirect(
      buildErrorUrl("salvar")
    );
  }

  if (existingProperty) {
    redirect(
      buildErrorUrl("id-existente")
    );
  }

  const {
    error: catalogError,
  } = await adminSupabase
    .from("property_catalog")
    .insert({
      id: propertyId,
      title,
      neighborhood,
      address:
        address || null,
      guests,
      bedrooms,
      bathrooms,
      beds,
      suites,
      area,
      garage,
      pet_friendly:
        formData.get(
          "petFriendly"
        ) === "on",
      pool:
        formData.get("pool") === "on",
      barbecue:
        formData.get(
          "barbecue"
        ) === "on",
      wifi:
        formData.get("wifi") === "on",
      air_conditioning:
        formData.get(
          "airConditioning"
        ) === "on",
      kitchen:
        formData.get(
          "kitchen"
        ) === "on",
      washing_machine:
        formData.get(
          "washingMachine"
        ) === "on",
      beach_distance:
        beachDistance,
      checkin,
      checkout,
      image,
      gallery,
      description,
      amenities,
      rules,
      airbnb,
      booking:
        booking || null,
      whatsapp,
      rating,
      reviews,
      latitude,
      longitude,
      keywords,
      active,
      featured,
      display_order:
        displayOrder,
    });

  if (catalogError) {
    console.error(
      "Erro ao cadastrar imóvel no catálogo:",
      catalogError
    );

    redirect(
      buildErrorUrl("salvar")
    );
  }

  const {
    error: pricingError,
  } = await adminSupabase
    .from("property_pricing")
    .insert({
      property_id:
        propertyId,
      property_name:
        title,
      base_price:
        basePrice,
      cleaning_fee:
        cleaningFee,
      minimum_nights:
        minimumNights,
      minimum_price:
        minimumPrice,
      maximum_price:
        maximumPrice,
      active,
    });

  if (pricingError) {
    console.error(
      "Erro ao cadastrar preços do imóvel:",
      pricingError
    );

    await adminSupabase
      .from("property_catalog")
      .delete()
      .eq("id", propertyId);

    redirect(
      buildErrorUrl("salvar-precos")
    );
  }

  revalidatePath("/");
  revalidatePath("/casas");
  revalidatePath("/admin");
  revalidatePath("/sitemap.xml");

  redirect(
    "/admin?salvo=1"
  );
}
