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

export const runtime = "nodejs";

const STORAGE_BUCKET =
  "virtual-tour-images";

const MAX_FILE_SIZE =
  25 * 1024 * 1024;

const ALLOWED_TYPES =
  new Set([
    "image/jpeg",
    "image/webp",
  ]);

type UploadRequest = {
  tourId?: unknown;
  fileName?: unknown;
  mimeType?: unknown;
  size?: unknown;
};

function isValidUuid(
  value: string
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getExtension(
  mimeType: string
): string {
  return mimeType === "image/webp"
    ? "webp"
    : "jpg";
}

export async function POST(
  request: NextRequest
) {
  try {
    const authenticationClient =
      await createSupabaseServerClient();

    const {
      data: {
        user,
      },
    } =
      await authenticationClient.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sessão administrativa não encontrada.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: isAdmin,
    } =
      await authenticationClient.rpc(
        "is_management_admin"
      );

    if (isAdmin !== true) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Você não possui permissão para enviar imagens.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      (await request.json()) as
        UploadRequest;

    const tourId =
      typeof body.tourId === "string"
        ? body.tourId.trim()
        : "";

    const mimeType =
      typeof body.mimeType === "string"
        ? body.mimeType
            .trim()
            .toLowerCase()
        : "";

    const size =
      Number(body.size);

    if (!isValidUuid(tourId)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Identificador do passeio inválido.",
        },
        {
          status: 400,
        }
      );
    }

    if (!ALLOWED_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Utilize uma imagem JPG ou WebP.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(size) ||
      size <= 0 ||
      size > MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A imagem possui um tamanho inválido.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      createSupabaseAdminClient();

    const {
      data: tour,
      error: tourError,
    } = await supabase
      .from("virtual_tours")
      .select("id")
      .eq("id", tourId)
      .maybeSingle();

    if (tourError || !tour) {
      return NextResponse.json(
        {
          success: false,
          message:
            "O passeio virtual não foi encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const extension =
      getExtension(mimeType);

    const storagePath =
      `${tourId}/${crypto.randomUUID()}.${extension}`;

    const {
      data: upload,
      error: uploadError,
    } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(
        storagePath
      );

    if (uploadError || !upload) {
      console.error(
        "Erro ao autorizar imagem 360°:",
        uploadError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Não foi possível autorizar o envio da imagem.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      path: storagePath,
      token: upload.token,
    });
  } catch (error) {
    console.error(
      "Erro inesperado ao autorizar imagem 360°:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Ocorreu um erro inesperado ao preparar o envio.",
      },
      {
        status: 500,
      }
    );
  }
}
