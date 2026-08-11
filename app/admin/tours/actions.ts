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

function getFormText(
  formData: FormData,
  fieldName: string
): string {
  const value =
    formData.get(fieldName);

  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeSlug(
  value: string
): string {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function redirectWithError(
  message: string
): never {
  redirect(
    `/admin/tours/novo?erro=${encodeURIComponent(
      message
    )}`
  );
}

export async function createVirtualTour(
  formData: FormData
) {
  const authenticationClient =
    await createSupabaseServerClient();

  const {
    data: {
      user,
    },
  } =
    await authenticationClient.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const {
    data: isAdmin,
    error: permissionError,
  } =
    await authenticationClient.rpc(
      "is_management_admin"
    );

  if (
    permissionError ||
    isAdmin !== true
  ) {
    redirect("/admin");
  }

  const title =
    getFormText(
      formData,
      "title"
    ).slice(0, 150);

  const propertyId =
    getFormText(
      formData,
      "property_id"
    );

  const requestedSlug =
    getFormText(
      formData,
      "slug"
    );

  const slug =
    normalizeSlug(
      requestedSlug || title
    );

  const description =
    getFormText(
      formData,
      "description"
    ).slice(0, 2000);

  const brandName =
    getFormText(
      formData,
      "brand_name"
    ).slice(0, 120);

  const contactName =
    getFormText(
      formData,
      "contact_name"
    ).slice(0, 120);

  const contactWhatsApp =
    getFormText(
      formData,
      "contact_whatsapp"
    )
      .replace(/\D/g, "")
      .slice(0, 20);

  if (title.length < 2) {
    redirectWithError(
      "Informe o título do passeio."
    );
  }

  if (!slug) {
    redirectWithError(
      "Informe um endereço válido para o passeio."
    );
  }

  const supabase =
    createSupabaseAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from("virtual_tours")
    .insert({
      property_id:
        propertyId || null,
      title,
      slug,
      description:
        description || null,
      status: "draft",
      brand_name:
        brandName ||
        "Aluga Casa Búzios",
      contact_name:
        contactName || null,
      contact_whatsapp:
        contactWhatsApp || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error(
      "Erro ao criar passeio virtual:",
      error
    );

    if (error.code === "23505") {
      redirectWithError(
        "Já existe um passeio usando esse endereço."
      );
    }

    redirectWithError(
      "Não foi possível cadastrar o passeio virtual."
    );
  }

  revalidatePath(
    "/admin/tours"
  );

  redirect(
    `/admin/tours?criado=1&id=${data.id}`
  );
}

function isValidUuid(
  value: string
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getFormNumber(
  formData: FormData,
  fieldName: string,
  fallback = 0
): number {
  const value =
    Number(
      getFormText(
        formData,
        fieldName
      ).replace(",", ".")
    );

  return Number.isFinite(value)
    ? value
    : fallback;
}

async function requireAdminUser() {
  const authenticationClient =
    await createSupabaseServerClient();

  const {
    data: {
      user,
    },
  } =
    await authenticationClient.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const {
    data: isAdmin,
  } =
    await authenticationClient.rpc(
      "is_management_admin"
    );

  if (isAdmin !== true) {
    redirect("/admin");
  }

  return user;
}

export async function setStartScene(
  formData: FormData
) {
  await requireAdminUser();

  const tourId =
    getFormText(
      formData,
      "tour_id"
    );

  const sceneId =
    getFormText(
      formData,
      "scene_id"
    );

  if (
    !isValidUuid(tourId) ||
    !isValidUuid(sceneId)
  ) {
    throw new Error(
      "Identificador do ambiente inválido."
    );
  }

  const supabase =
    createSupabaseAdminClient();

  const {
    data: scene,
    error: sceneError,
  } = await supabase
    .from("virtual_tour_scenes")
    .select("id")
    .eq("id", sceneId)
    .eq("tour_id", tourId)
    .maybeSingle();

  if (sceneError || !scene) {
    throw new Error(
      "O ambiente não foi encontrado."
    );
  }

  const {
    error: resetError,
  } = await supabase
    .from("virtual_tour_scenes")
    .update({
      is_start: false,
    })
    .eq("tour_id", tourId);

  if (resetError) {
    throw new Error(
      "Não foi possível alterar o ambiente inicial."
    );
  }

  const {
    error: updateError,
  } = await supabase
    .from("virtual_tour_scenes")
    .update({
      is_start: true,
    })
    .eq("id", sceneId)
    .eq("tour_id", tourId);

  if (updateError) {
    throw new Error(
      "Não foi possível definir o ambiente inicial."
    );
  }

  revalidatePath(
    `/admin/tours/${tourId}`
  );

  redirect(
    `/admin/tours/${tourId}?inicio=1`
  );
}

export async function deleteVirtualTourScene(
  formData: FormData
) {
  await requireAdminUser();

  const tourId =
    getFormText(
      formData,
      "tour_id"
    );

  const sceneId =
    getFormText(
      formData,
      "scene_id"
    );

  if (
    !isValidUuid(tourId) ||
    !isValidUuid(sceneId)
  ) {
    throw new Error(
      "Identificador do ambiente inválido."
    );
  }

  const supabase =
    createSupabaseAdminClient();

  const {
    data: scene,
    error: sceneError,
  } = await supabase
    .from("virtual_tour_scenes")
    .select(`
      id,
      panorama_path,
      is_start
    `)
    .eq("id", sceneId)
    .eq("tour_id", tourId)
    .maybeSingle();

  if (sceneError || !scene) {
    throw new Error(
      "O ambiente não foi encontrado."
    );
  }

  const {
    error: storageError,
  } = await supabase.storage
    .from("virtual-tour-images")
    .remove([
      scene.panorama_path,
    ]);

  if (storageError) {
    console.error(
      "Erro ao excluir imagem 360°:",
      storageError
    );

    throw new Error(
      "Não foi possível excluir a imagem do ambiente."
    );
  }

  const {
    error: deleteError,
  } = await supabase
    .from("virtual_tour_scenes")
    .delete()
    .eq("id", sceneId)
    .eq("tour_id", tourId);

  if (deleteError) {
    throw new Error(
      "Não foi possível excluir o ambiente."
    );
  }

  const {
    data: nextScene,
  } = await supabase
    .from("virtual_tour_scenes")
    .select(`
      id,
      panorama_path
    `)
    .eq("tour_id", tourId)
    .order("sort_order", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (
    scene.is_start &&
    nextScene
  ) {
    await supabase
      .from("virtual_tour_scenes")
      .update({
        is_start: true,
      })
      .eq("id", nextScene.id);
  }

  await supabase
    .from("virtual_tours")
    .update({
      cover_image_path:
        nextScene?.panorama_path ??
        null,
    })
    .eq("id", tourId)
    .eq(
      "cover_image_path",
      scene.panorama_path
    );

  revalidatePath(
    `/admin/tours/${tourId}`
  );

  redirect(
    `/admin/tours/${tourId}?excluido=1`
  );
}

export async function publishVirtualTour(
  formData: FormData
) {
  await requireAdminUser();

  const tourId =
    getFormText(
      formData,
      "tour_id"
    );

  if (!isValidUuid(tourId)) {
    throw new Error(
      "Identificador do passeio inválido."
    );
  }

  const supabase =
    createSupabaseAdminClient();

  const [
    tourResult,
    scenesResult,
  ] = await Promise.all([
    supabase
      .from("virtual_tours")
      .select("id, slug")
      .eq("id", tourId)
      .maybeSingle(),

    supabase
      .from("virtual_tour_scenes")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("tour_id", tourId),
  ]);

  if (
    tourResult.error ||
    !tourResult.data
  ) {
    throw new Error(
      "O passeio virtual não foi encontrado."
    );
  }

  if (scenesResult.error) {
    throw new Error(
      "Não foi possível verificar os ambientes do passeio."
    );
  }

  if ((scenesResult.count ?? 0) === 0) {
    redirect(
      `/admin/tours/${tourId}?erro=sem-ambientes`
    );
  }

  const {
    error: updateError,
  } = await supabase
    .from("virtual_tours")
    .update({
      status: "published",
    })
    .eq("id", tourId);

  if (updateError) {
    console.error(
      "Erro ao publicar passeio virtual:",
      updateError
    );

    throw new Error(
      "Não foi possível publicar o passeio virtual."
    );
  }

  revalidatePath(
    "/admin/tours"
  );

  revalidatePath(
    `/admin/tours/${tourId}`
  );

  revalidatePath(
    `/tour/${tourResult.data.slug}`
  );

  redirect(
    `/admin/tours/${tourId}?publicado=1`
  );
}

export async function unpublishVirtualTour(
  formData: FormData
) {
  await requireAdminUser();

  const tourId =
    getFormText(
      formData,
      "tour_id"
    );

  if (!isValidUuid(tourId)) {
    throw new Error(
      "Identificador do passeio inválido."
    );
  }

  const supabase =
    createSupabaseAdminClient();

  const {
    data: tour,
    error: tourError,
  } = await supabase
    .from("virtual_tours")
    .select("id, slug")
    .eq("id", tourId)
    .maybeSingle();

  if (tourError || !tour) {
    throw new Error(
      "O passeio virtual não foi encontrado."
    );
  }

  const {
    error: updateError,
  } = await supabase
    .from("virtual_tours")
    .update({
      status: "draft",
    })
    .eq("id", tourId);

  if (updateError) {
    console.error(
      "Erro ao retirar publicação do passeio:",
      updateError
    );

    throw new Error(
      "Não foi possível retirar a publicação do passeio."
    );
  }

  revalidatePath(
    "/admin/tours"
  );

  revalidatePath(
    `/admin/tours/${tourId}`
  );

  revalidatePath(
    `/tour/${tour.slug}`
  );

  redirect(
    `/admin/tours/${tourId}?rascunho=1`
  );
}

export async function saveVirtualTourLink(
  formData: FormData
) {
  await requireAdminUser();

  const tourId =
    getFormText(
      formData,
      "tour_id"
    );

  const fromSceneId =
    getFormText(
      formData,
      "from_scene_id"
    );

  const toSceneId =
    getFormText(
      formData,
      "to_scene_id"
    );

  const yawDegrees =
    Math.max(
      -180,
      Math.min(
        180,
        getFormNumber(
          formData,
          "yaw_degrees"
        )
      )
    );

  const pitchDegrees =
    Math.max(
      -90,
      Math.min(
        90,
        getFormNumber(
          formData,
          "pitch_degrees"
        )
      )
    );

  const label =
    getFormText(
      formData,
      "label"
    ).slice(0, 100);

  if (
    !isValidUuid(tourId) ||
    !isValidUuid(fromSceneId) ||
    !isValidUuid(toSceneId)
  ) {
    throw new Error(
      "Identificador da conexão inválido."
    );
  }

  if (fromSceneId === toSceneId) {
    throw new Error(
      "Escolha outro ambiente como destino."
    );
  }

  const supabase =
    createSupabaseAdminClient();

  const {
    data: scenes,
    error: scenesError,
  } = await supabase
    .from("virtual_tour_scenes")
    .select("id")
    .eq("tour_id", tourId)
    .in("id", [
      fromSceneId,
      toSceneId,
    ]);

  if (
    scenesError ||
    (scenes ?? []).length !== 2
  ) {
    throw new Error(
      "Os ambientes selecionados não pertencem a este passeio."
    );
  }

  const {
    data: existingLink,
    error: existingError,
  } = await supabase
    .from("virtual_tour_links")
    .select("id")
    .eq(
      "from_scene_id",
      fromSceneId
    )
    .eq(
      "to_scene_id",
      toSceneId
    )
    .maybeSingle();

  if (existingError) {
    throw new Error(
      "Não foi possível verificar a conexão."
    );
  }

  const linkValues = {
    from_scene_id:
      fromSceneId,
    to_scene_id:
      toSceneId,
    yaw_degrees:
      yawDegrees,
    pitch_degrees:
      pitchDegrees,
    label:
      label || null,
  };

  const result =
    existingLink
      ? await supabase
          .from(
            "virtual_tour_links"
          )
          .update(linkValues)
          .eq(
            "id",
            existingLink.id
          )
      : await supabase
          .from(
            "virtual_tour_links"
          )
          .insert(linkValues);

  if (result.error) {
    console.error(
      "Erro ao salvar conexão 360°:",
      result.error
    );

    throw new Error(
      "Não foi possível salvar a conexão entre os ambientes."
    );
  }

  revalidatePath(
    `/admin/tours/${tourId}`
  );

  redirect(
    `/admin/tours/${tourId}?conexao=1`
  );
}

export async function deleteVirtualTourLink(
  formData: FormData
) {
  await requireAdminUser();

  const tourId =
    getFormText(
      formData,
      "tour_id"
    );

  const linkId =
    getFormText(
      formData,
      "link_id"
    );

  if (
    !isValidUuid(tourId) ||
    !isValidUuid(linkId)
  ) {
    throw new Error(
      "Identificador da conexão inválido."
    );
  }

  const supabase =
    createSupabaseAdminClient();

  const {
    data: link,
    error: linkError,
  } = await supabase
    .from("virtual_tour_links")
    .select(`
      id,
      from_scene_id
    `)
    .eq("id", linkId)
    .maybeSingle();

  if (linkError || !link) {
    throw new Error(
      "A conexão não foi encontrada."
    );
  }

  const {
    data: sourceScene,
  } = await supabase
    .from("virtual_tour_scenes")
    .select("id")
    .eq(
      "id",
      link.from_scene_id
    )
    .eq("tour_id", tourId)
    .maybeSingle();

  if (!sourceScene) {
    throw new Error(
      "A conexão não pertence a este passeio."
    );
  }

  const {
    error: deleteError,
  } = await supabase
    .from("virtual_tour_links")
    .delete()
    .eq("id", linkId);

  if (deleteError) {
    throw new Error(
      "Não foi possível excluir a conexão."
    );
  }

  revalidatePath(
    `/admin/tours/${tourId}`
  );

  redirect(
    `/admin/tours/${tourId}?conexao_excluida=1`
  );
}
