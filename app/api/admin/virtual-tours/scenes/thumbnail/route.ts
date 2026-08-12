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

const MAX_THUMBNAIL_SIZE =
  2 * 1024 * 1024;

type SceneRecord = {
  id: string;
  panorama_path: string;
  thumbnail_path: string | null;
};

function isValidUuid(
  value: string
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getFormText(
  formData: FormData,
  fieldName: string
): string {
  const value =
    formData.get(
      fieldName
    );

  return typeof value ===
    "string"
    ? value.trim()
    : "";
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
            "Você não possui permissão para otimizar as imagens.",
        },
        {
          status: 403,
        }
      );
    }

    const formData =
      await request.formData();

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

    const thumbnail =
      formData.get(
        "thumbnail"
      );

    if (
      !isValidUuid(tourId) ||
      !isValidUuid(sceneId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "O passeio ou o ambiente é inválido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !(thumbnail instanceof File) ||
      thumbnail.type !==
        "image/webp" ||
      thumbnail.size <= 0 ||
      thumbnail.size >
        MAX_THUMBNAIL_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A miniatura gerada é inválida.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      createSupabaseAdminClient();

    const {
      data: sceneData,
      error: sceneError,
    } = await supabase
      .from(
        "virtual_tour_scenes"
      )
      .select(`
        id,
        panorama_path,
        thumbnail_path
      `)
      .eq("id", sceneId)
      .eq("tour_id", tourId)
      .maybeSingle();

    if (
      sceneError ||
      !sceneData
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "O ambiente não foi encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const scene =
      sceneData as
        SceneRecord;

    const thumbnailPath =
      `${tourId}/thumbnails/${sceneId}-${crypto.randomUUID()}.webp`;

    const fileBuffer =
      Buffer.from(
        await thumbnail.arrayBuffer()
      );

    const {
      error: uploadError,
    } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(
        thumbnailPath,
        fileBuffer,
        {
          contentType:
            "image/webp",
          cacheControl:
            "31536000",
          upsert: false,
        }
      );

    if (uploadError) {
      console.error(
        "Erro ao enviar miniatura do passeio 360°:",
        uploadError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Não foi possível salvar a miniatura.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      error: updateError,
    } = await supabase
      .from(
        "virtual_tour_scenes"
      )
      .update({
        thumbnail_path:
          thumbnailPath,
      })
      .eq("id", sceneId)
      .eq("tour_id", tourId);

    if (updateError) {
      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([
          thumbnailPath,
        ]);

      console.error(
        "Erro ao vincular miniatura do passeio 360°:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "A miniatura foi criada, mas não pôde ser vinculada ao ambiente.",
        },
        {
          status: 500,
        }
      );
    }

    const previousThumbnailPath =
      scene.thumbnail_path;

    if (
      previousThumbnailPath &&
      previousThumbnailPath !==
        scene.panorama_path &&
      previousThumbnailPath.startsWith(
        `${tourId}/thumbnails/`
      )
    ) {
      const {
        error: removeError,
      } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([
          previousThumbnailPath,
        ]);

      if (removeError) {
        console.error(
          "Não foi possível remover a miniatura anterior:",
          removeError
        );
      }
    }

    return NextResponse.json({
      success: true,
      thumbnailPath,
    });
  } catch (error) {
    console.error(
      "Erro inesperado ao otimizar miniatura 360°:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Ocorreu um erro inesperado ao otimizar a miniatura.",
      },
      {
        status: 500,
      }
    );
  }
}
