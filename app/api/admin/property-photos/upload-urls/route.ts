import {
  randomUUID,
} from "node:crypto";

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

export const runtime =
  "nodejs";

const STORAGE_BUCKET =
  "property-photos";

const MAX_PHOTOS = 25;

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const MAX_TOTAL_SIZE =
  150 * 1024 * 1024;

const ALLOWED_FILE_TYPES =
  new Map<string, string>([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ]);

type PhotoMetadata = {
  name?: unknown;
  type?: unknown;
  size?: unknown;
};

type UploadRequestBody = {
  propertyId?: unknown;
  photos?: unknown;
};

function slugify(
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

function isPhotoMetadata(
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

  const photo =
    value as PhotoMetadata;

  return (
    typeof photo.name === "string" &&
    photo.name.trim() !== "" &&
    typeof photo.type === "string" &&
    typeof photo.size === "number" &&
    Number.isFinite(photo.size)
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
            "Você precisa entrar no painel administrativo.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await request.json()) as UploadRequestBody;

    const propertyId =
      typeof body.propertyId === "string"
        ? slugify(body.propertyId)
        : "";

    if (!propertyId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Informe o identificador do imóvel antes de enviar as fotos.",
        },
        {
          status: 400,
        }
      );
    }

    if (!Array.isArray(body.photos)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Nenhuma foto foi informada.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      body.photos.length < 1 ||
      body.photos.length > MAX_PHOTOS
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Selecione entre 1 e ${MAX_PHOTOS} fotos.`,
        },
        {
          status: 400,
        }
      );
    }

    const photos =
      body.photos.filter(
        isPhotoMetadata
      );

    if (
      photos.length !==
      body.photos.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Os dados de uma ou mais fotos são inválidos.",
        },
        {
          status: 400,
        }
      );
    }

    let totalSize = 0;

    for (const photo of photos) {
      const normalizedType =
        photo.type.toLowerCase();

      if (
        !ALLOWED_FILE_TYPES.has(
          normalizedType
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `Formato não permitido: ${photo.name}. Use JPG, PNG ou WebP.`,
          },
          {
            status: 400,
          }
        );
      }

      if (
        photo.size <= 0 ||
        photo.size > MAX_FILE_SIZE
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `A foto ${photo.name} precisa ter no máximo 10 MB.`,
          },
          {
            status: 400,
          }
        );
      }

      totalSize += photo.size;
    }

    if (
      totalSize > MAX_TOTAL_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "O conjunto de fotos ultrapassa o limite total de 150 MB.",
        },
        {
          status: 400,
        }
      );
    }

    const adminSupabase =
      createSupabaseAdminClient();

    const uploads = [];

    for (
      let index = 0;
      index < photos.length;
      index += 1
    ) {
      const photo =
        photos[index];

      const normalizedType =
        photo.type.toLowerCase();

      const extension =
        ALLOWED_FILE_TYPES.get(
          normalizedType
        );

      if (!extension) {
        continue;
      }

      const storagePath =
        `properties/${propertyId}/` +
        `${String(
          index + 1
        ).padStart(2, "0")}-` +
        `${randomUUID()}.` +
        extension;

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
          "Erro ao autorizar upload da foto:",
          signedUploadError
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "Não foi possível preparar o envio das fotos.",
          },
          {
            status: 500,
          }
        );
      }

      const {
        data: publicUrlData,
      } = adminSupabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(
          storagePath
        );

      uploads.push({
        originalName:
          photo.name,

        mimeType:
          normalizedType,

        size:
          photo.size,

        path:
          storagePath,

        token:
          signedUpload.token,

        publicUrl:
          publicUrlData.publicUrl,
      });
    }

    return NextResponse.json({
      success: true,
      bucket:
        STORAGE_BUCKET,
      uploads,
    });
  } catch (error) {
    console.error(
      "Erro ao preparar upload das fotos do imóvel:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Não foi possível preparar o envio das fotos.",
      },
      {
        status: 500,
      }
    );
  }
}