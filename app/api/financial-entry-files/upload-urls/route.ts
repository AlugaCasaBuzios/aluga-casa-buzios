import { randomUUID } from "node:crypto";

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
const MAX_TOTAL_SIZE =
  30 * 1024 * 1024;

const ALLOWED_FILE_TYPES =
  new Map<string, string>([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
    ["application/pdf", "pdf"],
  ]);

type FileMetadata = {
  name?: unknown;
  type?: unknown;
  size?: unknown;
};

type UploadRequestBody = {
  financialEntryId?: unknown;
  files?: unknown;
};

function isValidUuid(
  value: string
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isFileMetadata(
  value: unknown
): value is {
  name: string;
  type: string;
  size: number;
} {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const file =
    value as FileMetadata;

  return (
    typeof file.name === "string" &&
    file.name.trim() !== "" &&
    file.name.length <= 180 &&
    typeof file.type === "string" &&
    typeof file.size === "number" &&
    Number.isFinite(file.size)
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
            "Faça login para enviar documentos financeiros.",
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
        UploadRequestBody;

    const financialEntryId =
      typeof body.financialEntryId ===
      "string"
        ? body.financialEntryId.trim()
        : "";

    if (
      !isValidUuid(financialEntryId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "O lançamento financeiro informado é inválido.",
        },
        {
          status: 400,
        }
      );
    }

    const adminSupabase =
      createSupabaseAdminClient();

    const {
      data: financialEntry,
      error: entryError,
    } = await adminSupabase
      .from(
        "property_financial_entries"
      )
      .select("id")
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

    if (!Array.isArray(body.files)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Nenhum documento foi informado.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      body.files.length < 1 ||
      body.files.length > MAX_FILES
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Selecione entre 1 e ${MAX_FILES} documentos.`,
        },
        {
          status: 400,
        }
      );
    }

    const files =
      body.files.filter(
        isFileMetadata
      );

    if (
      files.length !==
      body.files.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Os dados de um ou mais documentos são inválidos.",
        },
        {
          status: 400,
        }
      );
    }

    let totalSize = 0;

    for (const file of files) {
      const normalizedType =
        file.type.toLowerCase();

      if (
        !ALLOWED_FILE_TYPES.has(
          normalizedType
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `Formato não permitido: ${file.name}. Use JPG, PNG, WebP ou PDF.`,
          },
          {
            status: 400,
          }
        );
      }

      if (
        file.size <= 0 ||
        file.size > MAX_FILE_SIZE
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `${file.name} precisa ter no máximo 10 MB.`,
          },
          {
            status: 400,
          }
        );
      }

      totalSize += file.size;
    }

    if (
      totalSize > MAX_TOTAL_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "O conjunto de documentos ultrapassa o limite total de 30 MB.",
        },
        {
          status: 400,
        }
      );
    }

    const uploads = [];

    for (const file of files) {
      const normalizedType =
        file.type.toLowerCase();

      const extension =
        ALLOWED_FILE_TYPES.get(
          normalizedType
        );

      if (!extension) {
        continue;
      }

      const storagePath =
        `entries/${financialEntryId}/` +
        `${Date.now()}-${randomUUID()}.${extension}`;

      const {
        data: signedUpload,
        error: signedUploadError,
      } = await adminSupabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUploadUrl(
          storagePath
        );

      if (
        signedUploadError ||
        !signedUpload
      ) {
        console.error(
          "Erro ao autorizar documento financeiro:",
          signedUploadError
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "Não foi possível preparar o envio dos documentos.",
          },
          {
            status: 500,
          }
        );
      }

      uploads.push({
        originalName:
          file.name.trim(),
        mimeType: normalizedType,
        size: file.size,
        path: storagePath,
        token: signedUpload.token,
      });
    }

    return NextResponse.json({
      success: true,
      bucket: STORAGE_BUCKET,
      uploads,
    });
  } catch (error) {
    console.error(
      "Erro ao preparar documentos financeiros:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Não foi possível preparar o envio dos documentos.",
      },
      {
        status: 500,
      }
    );
  }
}
