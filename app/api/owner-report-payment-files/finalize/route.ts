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
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ]);

type UploadedFileInput = {
  originalName?: unknown;
  mimeType?: unknown;
  size?: unknown;
  path?: unknown;
};

type FinalizeRequestBody = {
  paymentId?: unknown;
  upload?: unknown;
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

function validateUpload(
  value: unknown,
  paymentId: string
): ValidatedUpload {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    throw new Error(
      "O comprovante é inválido."
    );
  }

  const upload =
    value as UploadedFileInput;

  const originalName =
    optionalText(
      upload.originalName,
      180
    );

  const mimeType = optionalText(
    upload.mimeType,
    100
  ).toLowerCase();

  const path = optionalText(
    upload.path,
    500
  );

  const size = Number(upload.size);

  if (
    !originalName ||
    !ALLOWED_FILE_TYPES.has(
      mimeType
    ) ||
    !Number.isFinite(size) ||
    size <= 0 ||
    size > MAX_FILE_SIZE ||
    !path.startsWith(
      `report-payments/${paymentId}/`
    ) ||
    path.split("/").length !== 3
  ) {
    throw new Error(
      "O comprovante possui dados inválidos."
    );
  }

  return {
    originalName,
    mimeType,
    size,
    path,
  };
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
            "Faça login para registrar o comprovante.",
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
        FinalizeRequestBody;

    const paymentId = optionalText(
      body.paymentId,
      50
    );

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

    const upload = validateUpload(
      body.upload,
      paymentId
    );

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
      await adminSupabase.storage
        .from(STORAGE_BUCKET)
        .remove([upload.path]);

      return NextResponse.json(
        {
          success: false,
          message:
            "Este pagamento já possui um comprovante.",
        },
        {
          status: 409,
        }
      );
    }

    const folder =
      `report-payments/${paymentId}`;

    const {
      data: storedFiles,
      error: listError,
    } = await adminSupabase.storage
      .from(STORAGE_BUCKET)
      .list(folder, {
        limit: 20,
        offset: 0,
      });

    if (listError) {
      console.error(
        "Erro ao conferir comprovante do pagamento:",
        listError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Não foi possível conferir o comprovante enviado.",
        },
        {
          status: 500,
        }
      );
    }

    const fileName = upload.path
      .split("/")
      .at(-1);

    const fileExists =
      fileName !== undefined &&
      (storedFiles ?? []).some(
        (file) =>
          file.name === fileName
      );

    if (!fileExists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "O comprovante ainda não foi enviado.",
        },
        {
          status: 400,
        }
      );
    }

    const { error: updateError } =
      await adminSupabase
        .from(
          "owner_report_payments"
        )
        .update({
          attachment_path:
            upload.path,
        })
        .eq("id", paymentId);

    if (updateError) {
      console.error(
        "Erro ao vincular comprovante ao pagamento:",
        updateError
      );

      await adminSupabase.storage
        .from(STORAGE_BUCKET)
        .remove([upload.path]);

      return NextResponse.json(
        {
          success: false,
          message:
            "O arquivo foi enviado, mas não pôde ser vinculado ao pagamento.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      attachmentPath:
        upload.path,
    });
  } catch (error) {
    console.error(
      "Erro ao finalizar comprovante do pagamento:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível registrar o comprovante.",
      },
      {
        status: 500,
      }
    );
  }
}
