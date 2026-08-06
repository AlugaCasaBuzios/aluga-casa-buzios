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

const STORAGE_BUCKET =
  "property-lead-photos";

const allowedStatuses =
  new Set([
    "new",
    "contacted",
    "evaluating",
    "approved",
    "rejected",
  ]);

function getFormText(
  formData: FormData,
  fieldName: string
): string {
  const value =
    formData.get(fieldName);

  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value.trim();
}

function isValidUuid(
  value: string
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
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

  return user;
}

export async function updateProposal(
  formData: FormData
) {
  await requireAdminUser();

  const proposalId =
    getFormText(
      formData,
      "proposal_id"
    );

  const status =
    getFormText(
      formData,
      "status"
    );

  const internalNotes =
    getFormText(
      formData,
      "internal_notes"
    ).slice(0, 5000);

  if (!isValidUuid(proposalId)) {
    throw new Error(
      "Identificador da proposta inválido."
    );
  }

  if (
    !allowedStatuses.has(status)
  ) {
    throw new Error(
      "Status da proposta inválido."
    );
  }

  const supabase =
    createSupabaseAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "property_management_leads"
    )
    .update({
      status,

      internal_notes:
        internalNotes || null,

      updated_at:
        new Date().toISOString(),
    })
    .eq("id", proposalId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(
      "Erro ao atualizar proposta:",
      error
    );

    throw new Error(
      "Não foi possível atualizar a proposta."
    );
  }

  if (!data) {
    throw new Error(
      "A proposta não foi encontrada."
    );
  }

  revalidatePath(
    "/admin/propostas"
  );

  revalidatePath(
    `/admin/propostas/${proposalId}`
  );

  redirect(
    `/admin/propostas/${proposalId}?salvo=1`
  );
}

export async function deleteProposal(
  formData: FormData
) {
  await requireAdminUser();

  const proposalId =
    getFormText(
      formData,
      "proposal_id"
    );

  const confirmation =
    getFormText(
      formData,
      "confirmation"
    ).toUpperCase();

  if (!isValidUuid(proposalId)) {
    throw new Error(
      "Identificador da proposta inválido."
    );
  }

  /*
   * A confirmação também é validada
   * no servidor. Isso impede que alguém
   * ignore a proteção do navegador.
   */
  if (
    confirmation !== "EXCLUIR"
  ) {
    throw new Error(
      "Digite EXCLUIR para confirmar a remoção."
    );
  }

  const supabase =
    createSupabaseAdminClient();

  /*
   * Confirma que a proposta existe antes
   * de remover qualquer arquivo.
   */
  const {
    data: proposal,
    error: proposalError,
  } = await supabase
    .from(
      "property_management_leads"
    )
    .select("id")
    .eq("id", proposalId)
    .maybeSingle();

  if (proposalError) {
    console.error(
      "Erro ao localizar proposta para exclusão:",
      proposalError
    );

    throw new Error(
      "Não foi possível localizar a proposta."
    );
  }

  if (!proposal) {
    throw new Error(
      "A proposta não foi encontrada."
    );
  }

  /*
   * Localiza todas as fotos armazenadas
   * dentro da pasta privada da proposta.
   */
  const {
    data: storedFiles,
    error: listError,
  } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(proposalId, {
      limit: 100,
      offset: 0,
      sortBy: {
        column: "name",
        order: "asc",
      },
    });

  if (listError) {
    console.error(
      "Erro ao localizar fotos da proposta:",
      listError
    );

    throw new Error(
      "Não foi possível verificar as fotos da proposta."
    );
  }

  const storagePaths =
    (storedFiles ?? [])
      .filter(
        (file) =>
          file.id !== null
      )
      .map(
        (file) =>
          `${proposalId}/${file.name}`
      );

  /*
   * Remove primeiro os arquivos privados.
   * Assim não deixamos fotos abandonadas
   * no Storage depois da exclusão.
   */
  if (
    storagePaths.length > 0
  ) {
    const {
      error: storageError,
    } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(storagePaths);

    if (storageError) {
      console.error(
        "Erro ao remover fotos da proposta:",
        storageError
      );

      throw new Error(
        "Não foi possível remover as fotos da proposta."
      );
    }
  }

  /*
   * Remove os registros das fotos.
   */
  const {
    error: photosError,
  } = await supabase
    .from(
      "property_management_lead_photos"
    )
    .delete()
    .eq(
      "lead_id",
      proposalId
    );

  if (photosError) {
    console.error(
      "Erro ao excluir registros das fotos:",
      photosError
    );

    throw new Error(
      "As fotos foram removidas, mas não foi possível excluir seus registros."
    );
  }

  /*
   * Por último, remove a proposta.
   */
  const {
    data: deletedProposal,
    error: deleteError,
  } = await supabase
    .from(
      "property_management_leads"
    )
    .delete()
    .eq("id", proposalId)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    console.error(
      "Erro ao excluir proposta:",
      deleteError
    );

    throw new Error(
      "Não foi possível excluir a proposta."
    );
  }

  if (!deletedProposal) {
    throw new Error(
      "A proposta não foi encontrada durante a exclusão."
    );
  }

  revalidatePath(
    "/admin"
  );

  revalidatePath(
    "/admin/propostas"
  );

  redirect(
    "/admin/propostas?excluido=1"
  );
}