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

import {
  getPropertyPublicationChecklist,
} from "@/lib/propertyPublicationChecklist";

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

  if (nextActive) {
    const [
      catalogChecklistResult,
      pricingChecklistResult,
    ] = await Promise.all([
      adminSupabase
        .from("property_catalog")
        .select(`
          title,
          neighborhood,
          description,
          image,
          gallery,
          guests,
          bedrooms,
          bathrooms,
          beds,
          amenities,
          whatsapp,
          latitude,
          longitude
        `)
        .eq("id", propertyId)
        .maybeSingle(),

      adminSupabase
        .from("property_pricing")
        .select(`
          base_price,
          minimum_nights
        `)
        .eq(
          "property_id",
          propertyId
        )
        .maybeSingle(),
    ]);

    if (
      catalogChecklistResult.error ||
      pricingChecklistResult.error ||
      !catalogChecklistResult.data ||
      !pricingChecklistResult.data
    ) {
      console.error(
        "Erro ao verificar o checklist de publicação:",
        catalogChecklistResult.error ??
          pricingChecklistResult.error
      );

      redirect(
        "/admin?erro=status"
      );
    }

    const publicationChecklist =
      getPropertyPublicationChecklist({
        title:
          catalogChecklistResult.data
            .title,
        neighborhood:
          catalogChecklistResult.data
            .neighborhood,
        description:
          catalogChecklistResult.data
            .description,
        image:
          catalogChecklistResult.data
            .image,
        gallery:
          catalogChecklistResult.data
            .gallery,
        guests:
          catalogChecklistResult.data
            .guests,
        bedrooms:
          catalogChecklistResult.data
            .bedrooms,
        bathrooms:
          catalogChecklistResult.data
            .bathrooms,
        beds:
          catalogChecklistResult.data
            .beds,
        amenities:
          catalogChecklistResult.data
            .amenities,
        whatsapp:
          catalogChecklistResult.data
            .whatsapp,
        latitude:
          catalogChecklistResult.data
            .latitude,
        longitude:
          catalogChecklistResult.data
            .longitude,
        basePrice:
          pricingChecklistResult.data
            .base_price,
        minimumNights:
          pricingChecklistResult.data
            .minimum_nights,
      });

    if (
      !publicationChecklist.ready
    ) {
      redirect(
        `/admin/imoveis/${encodeURIComponent(
          propertyId
        )}?erro=publicacao-incompleta#checklist-publicacao`
      );
    }
  }

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


const PROPERTY_PHOTO_BUCKET =
  "property-photos";

const PROPERTY_PHOTO_PAGE_SIZE = 100;

type PropertyPricingBackup = {
  property_id: string;
  property_name: string;
  base_price: number;
  cleaning_fee: number | null;
  minimum_nights: number | null;
  minimum_price: number | null;
  maximum_price: number | null;
  active: boolean;
};

async function removePropertyPhotos(
  propertyId: string
): Promise<boolean> {
  const adminSupabase =
    createSupabaseAdminClient();

  const folder =
    `properties/${propertyId}`;

  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const {
      data,
      error,
    } = await adminSupabase.storage
      .from(PROPERTY_PHOTO_BUCKET)
      .list(folder, {
        limit:
          PROPERTY_PHOTO_PAGE_SIZE,
        offset,
        sortBy: {
          column: "name",
          order: "asc",
        },
      });

    if (error) {
      console.error(
        "Erro ao listar fotos do imóvel para exclusão:",
        error
      );

      return false;
    }

    const items = data ?? [];

    paths.push(
      ...items
        .filter(
          (item) =>
            item.name !==
            ".emptyFolderPlaceholder"
        )
        .map(
          (item) =>
            `${folder}/${item.name}`
        )
    );

    if (
      items.length <
      PROPERTY_PHOTO_PAGE_SIZE
    ) {
      break;
    }

    offset +=
      PROPERTY_PHOTO_PAGE_SIZE;
  }

  for (
    let index = 0;
    index < paths.length;
    index += 100
  ) {
    const chunk = paths.slice(
      index,
      index + 100
    );

    const { error } =
      await adminSupabase.storage
        .from(
          PROPERTY_PHOTO_BUCKET
        )
        .remove(chunk);

    if (error) {
      console.error(
        "Erro ao remover fotos do imóvel:",
        error
      );

      return false;
    }
  }

  return true;
}

export async function deletePropertyPermanently(
  formData: FormData
) {
  const propertyId = String(
    formData.get("propertyId") ?? ""
  ).trim();

  const confirmation = String(
    formData.get("confirmation") ?? ""
  ).trim();

  const acknowledged =
    formData.get("acknowledge") ===
    "on";

  if (
    !propertyId ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      propertyId
    )
  ) {
    redirect(
      "/admin?erro=imovel"
    );
  }

  if (
    confirmation !== propertyId ||
    !acknowledged
  ) {
    redirect(
      "/admin?erro=exclusao-confirmacao"
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

  const [
    catalogResult,
    pricingResult,
  ] = await Promise.all([
    adminSupabase
      .from("property_catalog")
      .select(`
        id,
        active
      `)
      .eq("id", propertyId)
      .maybeSingle(),

    adminSupabase
      .from("property_pricing")
      .select(`
        property_id,
        property_name,
        base_price,
        cleaning_fee,
        minimum_nights,
        minimum_price,
        maximum_price,
        active
      `)
      .eq(
        "property_id",
        propertyId
      )
      .maybeSingle(),
  ]);

  if (
    catalogResult.error ||
    pricingResult.error
  ) {
    console.error(
      "Erro ao preparar a exclusão do imóvel:",
      catalogResult.error ??
        pricingResult.error
    );

    redirect(
      "/admin?erro=exclusao"
    );
  }

  if (
    !catalogResult.data ||
    !pricingResult.data
  ) {
    redirect(
      "/admin?erro=exclusao-nao-encontrado"
    );
  }

  const pricingBackup =
    pricingResult.data as
      PropertyPricingBackup;

  if (
    catalogResult.data.active ||
    pricingBackup.active
  ) {
    redirect(
      "/admin?erro=exclusao-ativo"
    );
  }

  const {
    data: deletedPricing,
    error: pricingDeleteError,
  } = await adminSupabase
    .from("property_pricing")
    .delete()
    .eq(
      "property_id",
      propertyId
    )
    .select("property_id")
    .maybeSingle();

  if (
    pricingDeleteError ||
    !deletedPricing
  ) {
    console.error(
      "Erro ao excluir os preços do imóvel:",
      pricingDeleteError
    );

    redirect(
      "/admin?erro=exclusao"
    );
  }

  const {
    data: deletedCatalog,
    error: catalogDeleteError,
  } = await adminSupabase
    .from("property_catalog")
    .delete()
    .eq("id", propertyId)
    .select("id")
    .maybeSingle();

  if (
    catalogDeleteError ||
    !deletedCatalog
  ) {
    console.error(
      "Erro ao excluir o imóvel do catálogo:",
      catalogDeleteError
    );

    const { error: rollbackError } =
      await adminSupabase
        .from("property_pricing")
        .insert(pricingBackup);

    if (rollbackError) {
      console.error(
        "Erro ao restaurar os preços após falha na exclusão:",
        rollbackError
      );
    }

    redirect(
      "/admin?erro=exclusao"
    );
  }

  const photosRemoved =
    await removePropertyPhotos(
      propertyId
    );

  revalidatePath("/");
  revalidatePath("/casas");
  revalidatePath("/admin");
  revalidatePath(
    `/imoveis/${propertyId}`
  );
  revalidatePath("/sitemap.xml");

  redirect(
    photosRemoved
      ? "/admin?status=excluido"
      : "/admin?status=excluido-limpeza"
  );
}
