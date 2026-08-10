import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";
import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STORAGE_BUCKET =
  "financial-entry-files";
const MAX_FILES = 5;
const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_FILE_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ]);

const DOCUMENT_TYPES =
  new Set([
    "invoice",
    "receipt",
    "payment_proof",
    "other",
  ]);

type UploadedFileInput = {
  originalName?: unknown;
  mimeType?: unknown;
  size?: unknown;
  path?: unknown;
};

type FinalizeRequestBody = {
  financialEntryId?: unknown;
  documentType?: unknown;
  documentNumber?: unknown;
  issuedAt?: unknown;
  notes?: unknown;
  uploads?: unknown;
};

type ValidatedUpload = {
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
};

function isValidUuid(
  value: string
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isDateOnly(
  value: string
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

  const [year, month, day] =
    value.split("-").map(Number);

  const parsed = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  return (
    parsed.getUTCFullYear() ===
      year &&
    parsed.getUTCMonth() ===
      month - 1 &&
    parsed.getUTCDate() === day
  );
}

function optionalText(
  value: unknown,
  maximumLength: number
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maximumLength);
}

function validateUploads(
  value: unknown,
  financialEntryId: string
): ValidatedUpload[] {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > MAX_FILES
  ) {
    throw new Error(
      `Informe entre 1 e ${MAX_FILES} documentos.`
    );
  }

  const uniquePaths =
    new Set<string>();

  return value.map(
    (
      item,
      index
    ): ValidatedUpload => {
      if (
        typeof item !== "object" ||
        item === null
      ) {
        throw new Error(
          `O documento ${index + 1} é inválido.`
        );
      }

      const upload =
        item as UploadedFileInput;

      const originalName =
        optionalText(
          upload.originalName,
          180
        );

      const mimeType =
        optionalText(
          upload.mimeType,
          100
        ).toLowerCase();

      const path = optionalText(
        upload.path,
        500
      );

      const size =
        Number(upload.size);

      if (
        !originalName ||
        !ALLOWED_FILE_TYPES.has(
          mimeType
        ) ||
        !Number.isFinite(size) ||
        size <= 0 ||
        size > MAX_FILE_SIZE ||
        !path.startsWith(
          `entries/${financialEntryId}/`
        ) ||
        path.split("/").length !== 3 ||
        uniquePaths.has(path)
      ) {
        throw new Error(
          `O documento ${index + 1} possui dados inválidos.`
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
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const supabase =
      await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Faça login para registrar documentos financeiros.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("management_users")
      .select("role, active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile?.active ||
      profile.role !== "admin"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Seu usuário não possui acesso aos documentos financeiros.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      (await request.json()) as
        FinalizeRequestBody;

    const financialEntryId =
      optionalText(
        body.financialEntryId,
        50
      );

    const documentType =
      optionalText(
        body.documentType,
        40
      );

    const documentNumber =
      optionalText(
        body.documentNumber,
        100
      );

    const issuedAt = optionalText(
      body.issuedAt,
      10
    );

    const notes = optionalText(
      body.notes,
      1000
    );

    if (
      !isValidUuid(financialEntryId) ||
      !DOCUMENT_TYPES.has(
        documentType
      ) ||
      (issuedAt &&
        !isDateOnly(issuedAt))
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Revise os dados do documento.",
        },
        {
          status: 400,
        }
      );
    }

    const uploads =
      validateUploads(
        body.uploads,
        financialEntryId
      );

    const adminSupabase =
      createSupabaseAdminClient();

    const {
      data: financialEntry,
      error: entryError,
    } = await adminSupabase
      .from(
        "property_financial_entries"
      )
      .select("id, entry_type")
      .eq("id", financialEntryId)
      .maybeSingle();

    if (
      entryError ||
      !financialEntry
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "O lançamento financeiro não foi encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const folder =
      `entries/${financialEntryId}`;

    const {
      data: storedFiles,
      error: listError,
    } = await adminSupabase.storage
      .from(STORAGE_BUCKET)
      .list(folder, {
        limit: 100,
        offset: 0,
      });

    if (listError) {
      console.error(
        "Erro ao conferir documentos financeiros:",
        listError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Não foi possível conferir os documentos enviados.",
        },
        {
          status: 500,
        }
      );
    }

    const storedNames = new Set(
      (storedFiles ?? []).map(
        (file) => file.name
      )
    );

    const allFilesExist =
      uploads.every((upload) => {
        const fileName =
          upload.path
            .split("/")
            .at(-1);

        return (
          fileName !== undefined &&
          storedNames.has(fileName)
        );
      });

    if (!allFilesExist) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Um ou mais documentos ainda não foram enviados.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: existingRows,
      error: existingError,
    } = await adminSupabase
      .from(
        "property_financial_entry_attachments"
      )
      .select("storage_path")
      .in(
        "storage_path",
        uploads.map(
          (upload) => upload.path
        )
      );

    if (existingError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Não foi possível conferir os documentos já registrados.",
        },
        {
          status: 500,
        }
      );
    }

    const existingPaths = new Set(
      (existingRows ?? []).map(
        (row) => row.storage_path
      )
    );

    const newUploads =
      uploads.filter(
        (upload) =>
          !existingPaths.has(
            upload.path
          )
      );

    if (newUploads.length > 0) {
      const {
        error: insertError,
      } = await adminSupabase
        .from(
          "property_financial_entry_attachments"
        )
        .insert(
          newUploads.map(
            (upload) => ({
              financial_entry_id:
                financialEntryId,
              storage_bucket:
                STORAGE_BUCKET,
              storage_path:
                upload.path,
              original_name:
                upload.originalName,
              mime_type:
                upload.mimeType,
              size_bytes:
                upload.size,
              document_type:
                documentType,
              document_number:
                documentNumber || null,
              issued_at:
                issuedAt || null,
              notes: notes || null,
              created_by: user.id,
            })
          )
        );

      if (insertError) {
        console.error(
          "Erro ao registrar documentos financeiros:",
          insertError
        );

        await adminSupabase.storage
          .from(STORAGE_BUCKET)
          .remove(
            newUploads.map(
              (upload) =>
                upload.path
            )
          );

        return NextResponse.json(
          {
            success: false,
            message:
              "Os arquivos foram enviados, mas não puderam ser registrados.",
          },
          {
            status: 500,
          }
        );
      }
    }

    if (
      financialEntry.entry_type ===
      "expense"
    ) {
      const {
        error: updateError,
      } = await adminSupabase
        .from(
          "property_financial_entries"
        )
        .update({
          receipt_status: "received",
        })
        .eq("id", financialEntryId);

      if (updateError) {
        console.error(
          "Erro ao atualizar comprovante da despesa:",
          updateError
        );
      }
    }

    return NextResponse.json({
      success: true,
      filesRegistered:
        newUploads.length,
    });
  } catch (error) {
    console.error(
      "Erro ao finalizar documentos financeiros:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível registrar os documentos.",
      },
      {
        status: 500,
      }
    );
  }
}
