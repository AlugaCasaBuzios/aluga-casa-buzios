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

export const dynamic =
  "force-dynamic";
export const runtime = "nodejs";

const STORAGE_BUCKET =
  "financial-entry-files";
const MAX_FILE_SIZE =
  10 * 1024 * 1024;

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
  paymentId?: unknown;
  file?: unknown;
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
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Faça login para enviar o comprovante.",
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
            "Seu usuário não possui acesso aos comprovantes.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      (await request.json()) as
        UploadRequestBody;

    const paymentId =
      typeof body.paymentId ===
      "string"
        ? body.paymentId.trim()
        : "";

    if (!isValidUuid(paymentId)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "O pagamento informado é inválido.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isFileMetadata(body.file)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selecione um comprovante válido.",
        },
        {
          status: 400,
        }
      );
    }

    const file = body.file;
    const normalizedType =
      file.type.toLowerCase();

    const extension =
      ALLOWED_FILE_TYPES.get(
        normalizedType
      );

    if (!extension) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Use um comprovante JPG, PNG, WebP ou PDF.",
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
            "O comprovante precisa ter no máximo 10 MB.",
        },
        {
          status: 400,
        }
      );
    }

    const adminSupabase =
      createSupabaseAdminClient();

    const {
      data: payment,
      error: paymentError,
    } = await adminSupabase
      .from("owner_report_payments")
      .select(
        "id, attachment_path"
      )
      .eq("id", paymentId)
      .maybeSingle();

    if (
      paymentError ||
      !payment
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "O pagamento não foi encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    if (payment.attachment_path) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Este pagamento já possui um comprovante. Exclua-o antes de enviar outro.",
        },
        {
          status: 409,
        }
      );
    }

    const storagePath =
      `report-payments/${paymentId}/` +
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
        "Erro ao autorizar comprovante do pagamento:",
        signedUploadError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Não foi possível preparar o envio do comprovante.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      bucket: STORAGE_BUCKET,
      upload: {
        originalName:
          file.name.trim(),
        mimeType: normalizedType,
        size: file.size,
        path: storagePath,
        token: signedUpload.token,
      },
    });
  } catch (error) {
    console.error(
      "Erro ao preparar comprovante do pagamento:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Não foi possível preparar o envio do comprovante.",
      },
      {
        status: 500,
      }
    );
  }
}
