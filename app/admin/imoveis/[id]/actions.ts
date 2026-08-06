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

export async function updatePropertyPhotos(
  formData: FormData
) {
  const propertyId = String(
    formData.get("propertyId") ?? ""
  ).trim();

  if (!propertyId) {
    redirect("/admin?erro=imovel");
  }

  const editPage =
    `/admin/imoveis/${encodeURIComponent(propertyId)}`;

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
