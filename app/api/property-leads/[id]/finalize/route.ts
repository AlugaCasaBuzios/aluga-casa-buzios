import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const STORAGE_BUCKET =
  "property-lead-photos";

const MAX_PHOTOS = 25;
const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_FILE_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ]);

type FinalizeRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

type FinalizePhotoInput = {
  originalName?: unknown;
  mimeType?: unknown;
  size?: unknown;
  path?: unknown;
};

type FinalizeRequest = {
  uploads?: unknown;
};

type ValidatedPhoto = {
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
};

class ValidationError extends Error {}

function isValidUuid(
  value: string
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function requiredText(
  value: unknown,
  fieldName: string,
  maximumLength: number
): string {
  if (typeof value !== "string") {
    throw new ValidationError(
      `O campo ${fieldName} é inválido.`
    );
  }

  const normalizedValue =
    value.trim();

  if (!normalizedValue) {
    throw new ValidationError(
      `O campo ${fieldName} é obrigatório.`
    );
  }

  return normalizedValue.slice(
    0,
    maximumLength
  );
}

function validateUploads(
  value: unknown,
  leadId: string
): ValidatedPhoto[] {
  if (
    value === undefined ||
    value === null
  ) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ValidationError(
      "A relação de fotos é inválida."
    );
  }

  if (
    value.length > MAX_PHOTOS
  ) {
    throw new ValidationError(
      `São permitidas no máximo ${MAX_PHOTOS} fotos.`
    );
  }

  const uniquePaths =
    new Set<string>();

  const uploads =
    value.map(
      (
        item,
        index
      ): ValidatedPhoto => {
        if (
          !item ||
          typeof item !== "object"
        ) {
          throw new ValidationError(
            `A foto ${index + 1} é inválida.`
          );
        }

        const photo =
          item as FinalizePhotoInput;

        const originalName =
          requiredText(
            photo.originalName,
            `nome da foto ${
              index + 1
            }`,
            180
          );

        const mimeType =
          requiredText(
            photo.mimeType,
            `tipo da foto ${
              index + 1
            }`,
            100
          ).toLowerCase();

        const path =
          requiredText(
            photo.path,
            `caminho da foto ${
              index + 1
            }`,
            500
          );

        const size =
          Number(photo.size);

        if (
          !ALLOWED_FILE_TYPES.has(
            mimeType
          )
        ) {
          throw new ValidationError(
            `O formato da foto ${originalName} não é permitido.`
          );
        }

        if (
          !Number.isFinite(size) ||
          size <= 0 ||
          size > MAX_FILE_SIZE
        ) {
          throw new ValidationError(
            `A foto ${originalName} possui um tamanho inválido.`
          );
        }

        if (
          !path.startsWith(
            `${leadId}/`
          )
        ) {
          throw new ValidationError(
            "O caminho de uma das fotos não pertence a esta proposta."
          );
        }

        const pathParts =
          path.split("/");

        if (
          pathParts.length !== 2 ||
          !pathParts[1]
        ) {
          throw new ValidationError(
            "O caminho de uma das fotos é inválido."
          );
        }

        if (
          uniquePaths.has(path)
        ) {
          throw new ValidationError(
            "A mesma foto foi informada mais de uma vez."
          );
        }

        uniquePaths.add(path);

        return {
          originalName,
          mimeType,
          size,
          path,
        };
      }
    );

  return uploads;
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: FinalizeRouteProps
) {
  try {
    const {
      id,
    } = await params;

    if (!isValidUuid(id)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Identificador da proposta inválido.",
        },
        {
          status: 400,
        }
      );
    }

    const body =
      (await request.json()) as
        FinalizeRequest;

    const uploads =
      validateUploads(
        body.uploads,
        id
      );

    const supabase =
      createSupabaseAdminClient();

    const {
      data: lead,
      error: leadError,
    } = await supabase
      .from(
        "property_management_leads"
      )
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (leadError) {
      console.error(
        "Erro ao localizar proposta:",
        leadError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Não foi possível localizar a proposta.",
        },
        {
          status: 500,
        }
      );
    }

    if (!lead) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A proposta não foi encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      data: storedFiles,
      error: listError,
    } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(id, {
        limit: 100,
        offset: 0,
        sortBy: {
          column: "name",
          order: "asc",
        },
      });

    if (listError) {
      console.error(
        "Erro ao verificar fotos:",
        listError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Não foi possível verificar as fotos enviadas.",
        },
        {
          status: 500,
        }
      );
    }

    const storedFileNames =
      new Set(
        (storedFiles ?? [])
          .filter(
            (file) =>
              file.id !== null
          )
          .map(
            (file) =>
              file.name
          )
      );

    const confirmedUploads =
      uploads.filter(
        (photo) => {
          const fileName =
            photo.path
              .split("/")
              .at(-1);

          return (
            fileName !== undefined &&
            storedFileNames.has(
              fileName
            )
          );
        }
      );

    const {
      error: deleteError,
    } = await supabase
      .from(
        "property_management_lead_photos"
      )
      .delete()
      .eq("lead_id", id);

    if (deleteError) {
      console.error(
        "Erro ao atualizar fotos:",
        deleteError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Não foi possível atualizar as fotos da proposta.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      confirmedUploads.length > 0
    ) {
      const {
        error: insertError,
      } = await supabase
        .from(
          "property_management_lead_photos"
        )
        .insert(
          confirmedUploads.map(
            (
              photo,
              index
            ) => ({
              lead_id: id,

              storage_path:
                photo.path,

              original_name:
                photo.originalName,

              mime_type:
                photo.mimeType,

              size_bytes:
                photo.size,

              sort_order:
                index,
            })
          )
        );

      if (insertError) {
        console.error(
          "Erro ao registrar fotos:",
          insertError
        );

        await supabase
          .from(
            "property_management_leads"
          )
          .update({
            photo_count: 0,
          })
          .eq("id", id);

        return NextResponse.json(
          {
            success: false,
            message:
              "As fotos foram enviadas, mas não puderam ser registradas.",
          },
          {
            status: 500,
          }
        );
      }
    }

    const {
      error: updateError,
    } = await supabase
      .from(
        "property_management_leads"
      )
      .update({
        photo_count:
          confirmedUploads.length,
      })
      .eq("id", id);

    if (updateError) {
      console.error(
        "Erro ao atualizar proposta:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Não foi possível finalizar a proposta.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,

      leadId: id,

      photosConfirmed:
        confirmedUploads.length,

      photosNotConfirmed:
        uploads.length -
        confirmedUploads.length,
    });
  } catch (error) {
    if (
      error instanceof
      ValidationError
    ) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        {
          status: 400,
        }
      );
    }

    console.error(
      "Erro inesperado ao finalizar proposta:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Ocorreu um erro inesperado ao finalizar a proposta.",
      },
      {
        status: 500,
      }
    );
  }
}