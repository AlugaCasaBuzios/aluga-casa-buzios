"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const STORAGE_BUCKET = "property-photos";
const MAX_PHOTOS = 25;

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

function parseInteger(
  value: FormDataEntryValue | null
): number | null {
  const numberValue = parseNumber(value);

  if (
    numberValue === null ||
    !Number.isInteger(numberValue)
  ) {
    return null;
  }

  return numberValue;
}

function parseLines(
  value: FormDataEntryValue | null
): string[] {
  if (typeof value !== "string") {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function buildEditPage(
  propertyId: string
): string {
  return `/admin/imoveis/${encodeURIComponent(propertyId)}`;
}

function getPropertyStoragePath(
  publicUrl: string,
  propertyId: string
): string | null {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  try {
    const parsedPublicUrl =
      new URL(publicUrl);

    const parsedSupabaseUrl =
      new URL(supabaseUrl);

    if (
      parsedPublicUrl.origin !==
      parsedSupabaseUrl.origin
    ) {
      return null;
    }

    const publicPathPrefix =
      `/storage/v1/object/public/${STORAGE_BUCKET}/`;

    if (
      !parsedPublicUrl.pathname.startsWith(
        publicPathPrefix
      )
    ) {
      return null;
    }

    const storagePath =
      decodeURIComponent(
        parsedPublicUrl.pathname.slice(
          publicPathPrefix.length
        )
      );

    const propertyPathPrefix =
      `properties/${propertyId}/`;

    if (
      !storagePath.startsWith(
        propertyPathPrefix
      )
    ) {
      return null;
    }

    return storagePath;
  } catch {
    return null;
  }
}

async function requireAuthenticatedUser() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  return supabase;
}

export async function updatePropertyDetails(
  formData: FormData
) {
  const propertyId = String(
    formData.get("propertyId") ?? ""
  ).trim();

  if (!propertyId) {
    redirect("/admin?erro=imovel");
  }

  const editPage = buildEditPage(propertyId);

  await requireAuthenticatedUser();

  const title = String(
    formData.get("title") ?? ""
  ).trim();

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
    formData.get("checkin") ?? ""
  ).trim();

  const checkout = String(
    formData.get("checkout") ?? ""
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

  const guests = parseInteger(
    formData.get("guests")
  );

  const bedrooms = parseInteger(
    formData.get("bedrooms")
  );

  const bathrooms = parseNumber(
    formData.get("bathrooms")
  );

  const beds = parseInteger(
    formData.get("beds")
  );

  const suites = parseInteger(
    formData.get("suites")
  );

  const area = parseNumber(
    formData.get("area")
  );

  const garage = parseInteger(
    formData.get("garage")
  );

  const rating = parseNumber(
    formData.get("rating")
  );

  const reviews = parseInteger(
    formData.get("reviews")
  );

  const latitude = parseNumber(
    formData.get("latitude")
  );

  const longitude = parseNumber(
    formData.get("longitude")
  );

  const displayOrder = parseInteger(
    formData.get("displayOrder")
  );

  if (!title) {
    redirect(`${editPage}?erro=dados-titulo`);
  }

  if (!neighborhood) {
    redirect(`${editPage}?erro=dados-bairro`);
  }

  if (
    guests === null ||
    guests < 1
  ) {
    redirect(`${editPage}?erro=dados-hospedes`);
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
    redirect(`${editPage}?erro=dados-numeros`);
  }

  if (
    rating === null ||
    rating < 0 ||
    rating > 5
  ) {
    redirect(`${editPage}?erro=dados-avaliacao`);
  }

  if (
    latitude !== null &&
    (
      latitude < -90 ||
      latitude > 90
    )
  ) {
    redirect(`${editPage}?erro=dados-latitude`);
  }

  if (
    longitude !== null &&
    (
      longitude < -180 ||
      longitude > 180
    )
  ) {
    redirect(`${editPage}?erro=dados-longitude`);
  }

  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(checkin) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(checkout)
  ) {
    redirect(`${editPage}?erro=dados-horarios`);
  }

  const amenities = parseLines(
    formData.get("amenities")
  );

  const rules = parseLines(
    formData.get("rules")
  );

  const keywords = parseLines(
    formData.get("keywords")
  );

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

  if (
    existingPropertyError ||
    !existingProperty
  ) {
    console.error(
      "Erro ao verificar o imóvel antes da atualização:",
      existingPropertyError
    );

    redirect(`${editPage}?erro=catalogo`);
  }

  const {
    error: catalogError,
  } = await adminSupabase
    .from("property_catalog")
    .update({
      title,
      neighborhood,
      address: address || null,
      guests,
      bedrooms,
      bathrooms,
      beds,
      suites,
      area,
      garage,
      pet_friendly:
        formData.get("petFriendly") === "on",
      pool:
        formData.get("pool") === "on",
      barbecue:
        formData.get("barbecue") === "on",
      wifi:
        formData.get("wifi") === "on",
      air_conditioning:
        formData.get("airConditioning") === "on",
      kitchen:
        formData.get("kitchen") === "on",
      washing_machine:
        formData.get("washingMachine") === "on",
      beach_distance: beachDistance,
      checkin,
      checkout,
      description,
      amenities,
      rules,
      airbnb,
      booking: booking || null,
      whatsapp,
      rating,
      reviews,
      latitude,
      longitude,
      keywords,
      featured:
        formData.get("featured") === "on",
      display_order: displayOrder,
    })
    .eq("id", propertyId);

  if (catalogError) {
    console.error(
      "Erro ao atualizar os dados do imóvel:",
      catalogError
    );

    redirect(`${editPage}?erro=salvar-dados`);
  }

  const {
    error: pricingNameError,
  } = await adminSupabase
    .from("property_pricing")
    .update({
      property_name: title,
    })
    .eq("property_id", propertyId);

  if (pricingNameError) {
    console.error(
      "Os dados foram atualizados, mas o nome da tabela de preços não foi sincronizado:",
      pricingNameError
    );
  }

  revalidatePath("/");
  revalidatePath("/casas");
  revalidatePath("/admin");
  revalidatePath(editPage);
  revalidatePath(`/imoveis/${propertyId}`);
  revalidatePath("/sitemap.xml");

  redirect(`${editPage}?dados=salvos`);
}

export async function updatePropertyPhotos(
  formData: FormData
) {
  const propertyId = String(
    formData.get("propertyId") ?? ""
  ).trim();

  if (!propertyId) {
    redirect("/admin?erro=imovel");
  }

  const editPage = buildEditPage(propertyId);

  const photoUploadStatus = String(
    formData.get("photoUploadStatus") ?? ""
  ).trim();

  if (photoUploadStatus === "pending") {
    redirect(
      `${editPage}?erro=fotos-pendentes`
    );
  }

  const gallery = parseLines(
    formData.get("gallery")
  );

  const discardedUploads = parseLines(
    formData.get("discardedUploads")
  );

  if (gallery.length === 0) {
    redirect(
      `${editPage}?erro=fotos-vazias`
    );
  }

  if (gallery.length > MAX_PHOTOS) {
    redirect(
      `${editPage}?erro=fotos-limite`
    );
  }

  await requireAuthenticatedUser();

  const adminSupabase =
    createSupabaseAdminClient();

  const {
    data: catalogData,
    error: catalogError,
  } = await adminSupabase
    .from("property_catalog")
    .select("id, image, gallery")
    .eq("id", propertyId)
    .maybeSingle();

  if (
    catalogError ||
    !catalogData
  ) {
    console.error(
      "Erro ao carregar as fotos do imóvel:",
      catalogError
    );

    redirect(
      `${editPage}?erro=catalogo`
    );
  }

  const existingPhotos = Array.from(
    new Set(
      [
        typeof catalogData.image === "string"
          ? catalogData.image.trim()
          : "",
        ...(
          Array.isArray(catalogData.gallery)
            ? catalogData.gallery
            : []
        ),
      ].filter(Boolean)
    )
  );

  const invalidPhoto = gallery.find(
    (photoUrl) =>
      !existingPhotos.includes(photoUrl) &&
      !getPropertyStoragePath(
        photoUrl,
        propertyId
      )
  );

  if (invalidPhoto) {
    redirect(
      `${editPage}?erro=fotos-invalidas`
    );
  }

  const {
    error: updateError,
  } = await adminSupabase
    .from("property_catalog")
    .update({
      image: gallery[0],
      gallery,
    })
    .eq("id", propertyId);

  if (updateError) {
    console.error(
      "Erro ao salvar as fotos do imóvel:",
      updateError
    );

    redirect(
      `${editPage}?erro=salvar-fotos`
    );
  }

  const finalPhotos =
    new Set(gallery);

  const removedExistingPhotos =
    existingPhotos.filter(
      (photoUrl) =>
        !finalPhotos.has(photoUrl)
    );

  const storagePathsToDelete = Array.from(
    new Set(
      [
        ...removedExistingPhotos,
        ...discardedUploads,
      ]
        .filter(
          (photoUrl) =>
            !finalPhotos.has(photoUrl)
        )
        .map((photoUrl) =>
          getPropertyStoragePath(
            photoUrl,
            propertyId
          )
        )
        .filter(
          (storagePath): storagePath is string =>
            Boolean(storagePath)
        )
    )
  );

  let cleanupWarning = false;

  if (
    storagePathsToDelete.length > 0
  ) {
    const {
      error: removeError,
    } = await adminSupabase.storage
      .from(STORAGE_BUCKET)
      .remove(storagePathsToDelete);

    if (removeError) {
      cleanupWarning = true;

      console.error(
        "Erro ao remover arquivos antigos das fotos:",
        removeError
      );
    }
  }

  revalidatePath("/");
  revalidatePath("/casas");
  revalidatePath("/admin");
  revalidatePath(editPage);
  revalidatePath(
    `/imoveis/${propertyId}`
  );

  redirect(
    cleanupWarning
      ? `${editPage}?fotos=salvas&aviso=limpeza`
      : `${editPage}?fotos=salvas`
  );
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

  const editPage = buildEditPage(propertyId);

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
    await requireAuthenticatedUser();

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
