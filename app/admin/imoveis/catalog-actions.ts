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
      featured: false,
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

export async function setPropertyFeatured(
  formData: FormData
): Promise<{
  ok: boolean;
  message: string;
}> {
  const MAX_HOME_FEATURED = 3;

  const propertyId = String(
    formData.get("propertyId") ?? ""
  ).trim();

  const nextFeatured =
    String(
      formData.get("nextFeatured") ?? ""
    ) === "true";

  if (!propertyId) {
    return {
      ok: false,
      message:
        "Não foi possível identificar o imóvel.",
    };
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
    data: propertyData,
    error: propertyError,
  } = await adminSupabase
    .from("property_catalog")
    .select(`
      id,
      active,
      featured
    `)
    .eq(
      "id",
      propertyId
    )
    .maybeSingle();

  if (
    propertyError ||
    !propertyData
  ) {
    console.error(
      "Erro ao carregar imóvel antes de alterar destaque:",
      propertyError
    );

    return {
      ok: false,
      message:
        "Não foi possível localizar o imóvel no catálogo.",
    };
  }

  if (nextFeatured) {
    if (!propertyData.active) {
      return {
        ok: false,
        message:
          "Ative o imóvel antes de adicioná-lo aos destaques da Home.",
      };
    }

    if (propertyData.featured) {
      return {
        ok: true,
        message:
          "O imóvel já está nos destaques da Home.",
      };
    }

    const {
      count,
      error: countError,
    } = await adminSupabase
      .from("property_catalog")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "active",
        true
      )
      .eq(
        "featured",
        true
      );

    if (countError) {
      console.error(
        "Erro ao contar os destaques da Home:",
        countError
      );

      return {
        ok: false,
        message:
          "Não foi possível verificar o limite de destaques.",
      };
    }

    if (
      (count ?? 0) >=
      MAX_HOME_FEATURED
    ) {
      return {
        ok: false,
        message:
          `A Home permite no máximo ${MAX_HOME_FEATURED} imóveis em destaque. Remova um destaque antes de escolher outro.`,
      };
    }
  }

  const {
    data,
    error,
  } = await adminSupabase
    .from("property_catalog")
    .update({
      featured: nextFeatured,
    })
    .eq(
      "id",
      propertyId
    )
    .select("id")
    .maybeSingle();

  if (
    error ||
    !data
  ) {
    console.error(
      "Erro ao alterar destaque do imóvel:",
      error
    );

    return {
      ok: false,
      message:
        "Não foi possível alterar o destaque do imóvel.",
    };
  }

  revalidatePath("/");
  revalidatePath("/admin");

  return {
    ok: true,
    message:
      nextFeatured
        ? "Imóvel adicionado aos destaques."
        : "Imóvel removido dos destaques.",
  };
}

type PropertyOrderDirection =
  | "up"
  | "down";

type PropertyOrderRow = {
  id: string;
  title: string;
  display_order: number;
};

export async function movePropertyDisplayOrder(
  formData: FormData
): Promise<{
  ok: boolean;
  message: string;
}> {
  const propertyId = String(
    formData.get("propertyId") ?? ""
  ).trim();

  const direction = String(
    formData.get("direction") ?? ""
  ).trim() as PropertyOrderDirection;

  if (
    !propertyId ||
    (
      direction !== "up" &&
      direction !== "down"
    )
  ) {
    return {
      ok: false,
      message:
        "Não foi possível identificar o imóvel ou a direção da movimentação.",
    };
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
    data,
    error,
  } = await adminSupabase
    .from("property_catalog")
    .select(`
      id,
      title,
      display_order
    `);

  if (error) {
    console.error(
      "Erro ao carregar a ordem dos imóveis:",
      error
    );

    return {
      ok: false,
      message:
        "Não foi possível carregar a ordem atual dos imóveis.",
    };
  }

  const rows =
    (
      (data ?? []) as PropertyOrderRow[]
    )
      .map((row) => ({
        ...row,
        display_order:
          Number.isFinite(
            Number(
              row.display_order
            )
          )
            ? Number(
                row.display_order
              )
            : 0,
      }))
      .sort((a, b) => {
        if (
          a.display_order !==
          b.display_order
        ) {
          return (
            a.display_order -
            b.display_order
          );
        }

        return a.title.localeCompare(
          b.title,
          "pt-BR"
        );
      });

  const currentIndex =
    rows.findIndex(
      (row) =>
        row.id === propertyId
    );

  if (currentIndex < 0) {
    return {
      ok: false,
      message:
        "O imóvel não foi encontrado no catálogo.",
    };
  }

  const targetIndex =
    direction === "up"
      ? currentIndex - 1
      : currentIndex + 1;

  if (
    targetIndex < 0 ||
    targetIndex >= rows.length
  ) {
    return {
      ok: true,
      message:
        "O imóvel já está no limite da ordem.",
    };
  }

  const reorderedRows = [
    ...rows,
  ];

  [
    reorderedRows[
      currentIndex
    ],
    reorderedRows[
      targetIndex
    ],
  ] = [
    reorderedRows[
      targetIndex
    ],
    reorderedRows[
      currentIndex
    ],
  ];

  const originalOrder =
    new Map(
      rows.map((row) => [
        row.id,
        row.display_order,
      ])
    );

  const updates =
    reorderedRows.map(
      (row, index) => ({
        id: row.id,
        displayOrder:
          (index + 1) * 10,
      })
    );

  const updatedIds: string[] =
    [];

  for (
    const update of updates
  ) {
    const originalValue =
      originalOrder.get(
        update.id
      );

    if (
      originalValue ===
      update.displayOrder
    ) {
      continue;
    }

    const {
      error: updateError,
    } = await adminSupabase
      .from(
        "property_catalog"
      )
      .update({
        display_order:
          update.displayOrder,
      })
      .eq(
        "id",
        update.id
      );

    if (updateError) {
      console.error(
        "Erro ao atualizar a ordem dos imóveis:",
        updateError
      );

      for (
        const updatedId of updatedIds
      ) {
        const rollbackValue =
          originalOrder.get(
            updatedId
          );

        if (
          rollbackValue ===
          undefined
        ) {
          continue;
        }

        const {
          error: rollbackError,
        } = await adminSupabase
          .from(
            "property_catalog"
          )
          .update({
            display_order:
              rollbackValue,
          })
          .eq(
            "id",
            updatedId
          );

        if (rollbackError) {
          console.error(
            "Erro ao restaurar a ordem do imóvel:",
            updatedId,
            rollbackError
          );
        }
      }

      return {
        ok: false,
        message:
          "Não foi possível alterar a ordem. A posição anterior foi preservada sempre que possível.",
      };
    }

    updatedIds.push(
      update.id
    );
  }

  revalidatePath("/");
  revalidatePath("/casas");
  revalidatePath("/admin");

  return {
    ok: true,
    message:
      "Ordem atualizada com sucesso.",
  };
}


type DuplicatePropertyResult =
  | {
      ok: true;
      propertyId: string;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

type PropertyCatalogDuplicateRow = {
  id: string;
  title: string;
  neighborhood: string;
  address: string | null;
  guests: number;
  bedrooms: number;
  bathrooms: number | string;
  beds: number;
  suites: number;
  area: number | string;
  garage: number;
  pet_friendly: boolean;
  pool: boolean;
  barbecue: boolean;
  wifi: boolean;
  air_conditioning: boolean;
  kitchen: boolean;
  washing_machine: boolean;
  beach_distance: string;
  checkin: string;
  checkout: string;
  image: string;
  gallery: string[] | null;
  description: string;
  amenities: string[] | null;
  rules: string[] | null;
  airbnb: string;
  booking: string | null;
  whatsapp: string;
  rating: number | string;
  reviews: number;
  latitude: number | null;
  longitude: number | null;
  keywords: string[] | null;
  active: boolean;
  featured: boolean;
  display_order: number;
};

function normalizeDuplicatedPropertyId(
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

export async function duplicateProperty(
  formData: FormData
): Promise<DuplicatePropertyResult> {
  const sourcePropertyId = String(
    formData.get("sourcePropertyId") ?? ""
  ).trim();

  const newTitle = String(
    formData.get("newTitle") ?? ""
  ).trim();

  const newPropertyId =
    normalizeDuplicatedPropertyId(
      String(
        formData.get("newPropertyId") ?? ""
      )
    );

  if (!sourcePropertyId) {
    return {
      ok: false,
      message:
        "Não foi possível identificar o imóvel que será duplicado.",
    };
  }

  if (!newTitle) {
    return {
      ok: false,
      message:
        "Informe o título da nova casa.",
    };
  }

  if (
    !newPropertyId ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      newPropertyId
    )
  ) {
    return {
      ok: false,
      message:
        "Informe um identificador válido para a nova casa.",
    };
  }

  if (
    newPropertyId === sourcePropertyId
  ) {
    return {
      ok: false,
      message:
        "A nova casa precisa ter um identificador diferente do imóvel original.",
    };
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
    sourceCatalogResult,
    sourcePricingResult,
    existingResult,
    lastOrderResult,
  ] = await Promise.all([
    adminSupabase
      .from("property_catalog")
      .select(`
        id,
        title,
        neighborhood,
        address,
        guests,
        bedrooms,
        bathrooms,
        beds,
        suites,
        area,
        garage,
        pet_friendly,
        pool,
        barbecue,
        wifi,
        air_conditioning,
        kitchen,
        washing_machine,
        beach_distance,
        checkin,
        checkout,
        image,
        gallery,
        description,
        amenities,
        rules,
        airbnb,
        booking,
        whatsapp,
        rating,
        reviews,
        latitude,
        longitude,
        keywords,
        active,
        featured,
        display_order
      `)
      .eq(
        "id",
        sourcePropertyId
      )
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
        sourcePropertyId
      )
      .maybeSingle(),

    adminSupabase
      .from("property_catalog")
      .select("id")
      .eq(
        "id",
        newPropertyId
      )
      .maybeSingle(),

    adminSupabase
      .from("property_catalog")
      .select("display_order")
      .order(
        "display_order",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle(),
  ]);

  if (
    sourceCatalogResult.error ||
    sourcePricingResult.error
  ) {
    console.error(
      "Erro ao carregar o imóvel para duplicação:",
      sourceCatalogResult.error ??
        sourcePricingResult.error
    );

    return {
      ok: false,
      message:
        "Não foi possível carregar os dados do imóvel original.",
    };
  }

  if (
    !sourceCatalogResult.data ||
    !sourcePricingResult.data
  ) {
    return {
      ok: false,
      message:
        "O imóvel original não foi encontrado.",
    };
  }

  if (existingResult.error) {
    console.error(
      "Erro ao verificar o identificador da cópia:",
      existingResult.error
    );

    return {
      ok: false,
      message:
        "Não foi possível verificar o identificador escolhido.",
    };
  }

  if (existingResult.data) {
    return {
      ok: false,
      message:
        "Já existe um imóvel com esse identificador. Escolha outro.",
    };
  }

  if (lastOrderResult.error) {
    console.error(
      "Erro ao verificar a última posição dos imóveis:",
      lastOrderResult.error
    );

    return {
      ok: false,
      message:
        "Não foi possível calcular a posição da nova casa.",
    };
  }

  const sourceCatalog =
    sourceCatalogResult.data as
      PropertyCatalogDuplicateRow;

  const sourcePricing =
    sourcePricingResult.data as
      PropertyPricingBackup;

  const currentLastOrder =
    Number(
      lastOrderResult.data
        ?.display_order ?? 0
    );

  const newDisplayOrder =
    Number.isFinite(
      currentLastOrder
    )
      ? currentLastOrder + 10
      : 10;

  const {
    error: catalogInsertError,
  } = await adminSupabase
    .from("property_catalog")
    .insert({
      id: newPropertyId,
      title: newTitle,
      neighborhood:
        sourceCatalog.neighborhood,
      address:
        sourceCatalog.address,
      guests:
        sourceCatalog.guests,
      bedrooms:
        sourceCatalog.bedrooms,
      bathrooms:
        sourceCatalog.bathrooms,
      beds:
        sourceCatalog.beds,
      suites:
        sourceCatalog.suites,
      area:
        sourceCatalog.area,
      garage:
        sourceCatalog.garage,
      pet_friendly:
        sourceCatalog.pet_friendly,
      pool:
        sourceCatalog.pool,
      barbecue:
        sourceCatalog.barbecue,
      wifi:
        sourceCatalog.wifi,
      air_conditioning:
        sourceCatalog.air_conditioning,
      kitchen:
        sourceCatalog.kitchen,
      washing_machine:
        sourceCatalog.washing_machine,
      beach_distance:
        sourceCatalog.beach_distance,
      checkin:
        sourceCatalog.checkin,
      checkout:
        sourceCatalog.checkout,

      // Fotos e links de plataformas não são compartilhados
      // entre imóveis para evitar referências ao anúncio original.
      image: "",
      gallery: [],
      airbnb: "",
      booking: null,

      description:
        sourceCatalog.description,
      amenities:
        sourceCatalog.amenities ?? [],
      rules:
        sourceCatalog.rules ?? [],
      whatsapp:
        sourceCatalog.whatsapp,

      // A nova casa começa sem avaliações.
      rating: 0,
      reviews: 0,

      latitude:
        sourceCatalog.latitude,
      longitude:
        sourceCatalog.longitude,
      keywords:
        sourceCatalog.keywords ?? [],

      // Toda cópia nasce inativa e não destacada.
      active: false,
      featured: false,
      display_order:
        newDisplayOrder,
    });

  if (catalogInsertError) {
    console.error(
      "Erro ao criar a cópia do imóvel:",
      catalogInsertError
    );

    return {
      ok: false,
      message:
        "Não foi possível criar a cópia do imóvel.",
    };
  }

  const {
    error: pricingInsertError,
  } = await adminSupabase
    .from("property_pricing")
    .insert({
      property_id:
        newPropertyId,
      property_name:
        newTitle,
      base_price:
        sourcePricing.base_price,
      cleaning_fee:
        sourcePricing.cleaning_fee,
      minimum_nights:
        sourcePricing.minimum_nights,
      minimum_price:
        sourcePricing.minimum_price,
      maximum_price:
        sourcePricing.maximum_price,
      active: false,
    });

  if (pricingInsertError) {
    console.error(
      "Erro ao copiar os preços do imóvel:",
      pricingInsertError
    );

    await adminSupabase
      .from("property_catalog")
      .delete()
      .eq(
        "id",
        newPropertyId
      );

    return {
      ok: false,
      message:
        "A cópia não foi concluída porque os preços não puderam ser criados.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/casas");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");

  return {
    ok: true,
    propertyId:
      newPropertyId,
    message:
      "Imóvel duplicado com sucesso.",
  };
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
