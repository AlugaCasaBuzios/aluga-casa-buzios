import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  revalidatePath,
} from "next/cache";

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

type FinalizeRequest = {
  tourId?: unknown;
  sceneId?: unknown;
  name?: unknown;
  path?: unknown;
  originalName?: unknown;
  mimeType?: unknown;
  size?: unknown;
  width?: unknown;
  height?: unknown;
  sortOrder?: unknown;
};

function isValidUuid(
  value: string
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getText(
  value: unknown,
  maximumLength: number
): string {
  return typeof value === "string"
    ? value
        .trim()
        .slice(0, maximumLength)
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
            "Você não possui permissão para cadastrar ambientes.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      (await request.json()) as
        FinalizeRequest;

    const tourId =
      getText(body.tourId, 100);

    const sceneId =
      getText(body.sceneId, 100);

    const name =
      getText(body.name, 100);

    const storagePath =
      getText(body.path, 500);

    const mimeType =
      getText(
        body.mimeType,
        100
      ).toLowerCase();

    const size =
      Number(body.size);

    const width =
      Number(body.width);

    const height =
      Number(body.height);

    const sortOrder =
      Math.max(
        0,
        Math.floor(
          Number(body.sortOrder) ||
          0
        )
      );

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

    if (
      sceneId &&
      !isValidUuid(sceneId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Identificador do ambiente inválido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !sceneId &&
      name.length < 2
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Informe o nome do ambiente.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !storagePath.startsWith(
        `${tourId}/`
      ) ||
      storagePath.split("/").length !==
        2
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "O caminho da imagem é inválido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !ALLOWED_TYPES.has(mimeType) ||
      !Number.isFinite(size) ||
      size <= 0 ||
      size > MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Os dados da imagem são inválidos.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0 ||
      width / height < 1.9 ||
      width / height > 2.1
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A imagem não possui a proporção 360° esperada.",
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
      .select(`
        id,
        slug,
        cover_image_path
      `)
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

    const fileName =
      storagePath.split("/")[1];

    const {
      data: storedFiles,
      error: listError,
    } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(tourId, {
        limit: 10,
        search: fileName,
      });

    if (
      listError ||
      !(storedFiles ?? []).some(
        (storedFile: {
          name: string;
        }) =>
          storedFile.name ===
          fileName
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A imagem enviada não foi localizada no armazenamento.",
        },
        {
          status: 400,
        }
      );
    }

    if (sceneId) {
      const {
        data: currentScene,
        error: currentSceneError,
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
        currentSceneError ||
        !currentScene
      ) {
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([
            storagePath,
          ]);

        return NextResponse.json(
          {
            success: false,
            message:
              "O ambiente que receberia a nova imagem não foi encontrado.",
          },
          {
            status: 404,
          }
        );
      }

      const {
        error: replaceError,
      } = await supabase
        .from(
          "virtual_tour_scenes"
        )
        .update({
          panorama_path:
            storagePath,
          thumbnail_path:
            storagePath,
        })
        .eq("id", sceneId)
        .eq("tour_id", tourId);

      if (replaceError) {
        console.error(
          "Erro ao substituir imagem do ambiente 360°:",
          replaceError
        );

        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([
            storagePath,
          ]);

        return NextResponse.json(
          {
            success: false,
            message:
              "A nova imagem foi enviada, mas não pôde ser vinculada ao ambiente.",
          },
          {
            status: 500,
          }
        );
      }

      if (
        tour.cover_image_path ===
        currentScene.panorama_path
      ) {
        const {
          error: coverError,
        } = await supabase
          .from("virtual_tours")
          .update({
            cover_image_path:
              storagePath,
          })
          .eq("id", tourId);

        if (coverError) {
          console.error(
            "Erro ao atualizar capa após substituir ambiente 360°:",
            coverError
          );

          await supabase
            .from(
              "virtual_tour_scenes"
            )
            .update({
              panorama_path:
                currentScene.panorama_path,
              thumbnail_path:
                currentScene.thumbnail_path ||
                currentScene.panorama_path,
            })
            .eq("id", sceneId)
            .eq(
              "tour_id",
              tourId
            );

          await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([
              storagePath,
            ]);

          return NextResponse.json(
            {
              success: false,
              message:
                "Não foi possível atualizar a imagem principal do passeio.",
            },
            {
              status: 500,
            }
          );
        }
      }

      const oldPaths =
        Array.from(
          new Set(
            [
              currentScene.panorama_path,
              currentScene.thumbnail_path,
            ].filter(
              (path): path is string =>
                Boolean(path) &&
                path !== storagePath
            )
          )
        );

      if (oldPaths.length > 0) {
        const {
          error: removeOldError,
        } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(oldPaths);

        if (removeOldError) {
          console.error(
            "A imagem antiga do ambiente 360° não pôde ser removida:",
            removeOldError
          );
        }
      }

      revalidatePath(
        `/admin/tours/${tourId}`
      );

      revalidatePath(
        `/tour/${tour.slug}`
      );

      return NextResponse.json({
        success: true,
        sceneId,
        replaced: true,
      });
    }

    const {
      count,
      error: countError,
    } = await supabase
      .from("virtual_tour_scenes")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("tour_id", tourId);

    if (countError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Não foi possível preparar o ambiente.",
        },
        {
          status: 500,
        }
      );
    }

    const isFirstScene =
      (count ?? 0) === 0;

    const {
      data: scene,
      error: insertError,
    } = await supabase
      .from("virtual_tour_scenes")
      .insert({
        tour_id: tourId,
        name,
        panorama_path:
          storagePath,
        thumbnail_path:
          storagePath,
        caption: name,
        sort_order: sortOrder,
        is_start:
          isFirstScene,
      })
      .select("id")
      .single();

    if (insertError || !scene) {
      console.error(
        "Erro ao cadastrar ambiente 360°:",
        insertError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "A imagem foi enviada, mas o ambiente não pôde ser cadastrado.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      isFirstScene ||
      !tour.cover_image_path
    ) {
      await supabase
        .from("virtual_tours")
        .update({
          cover_image_path:
            storagePath,
        })
        .eq("id", tourId);
    }

    revalidatePath(
      `/admin/tours/${tourId}`
    );

    revalidatePath(
      `/tour/${tour.slug}`
    );

    return NextResponse.json({
      success: true,
      sceneId: scene.id,
    });
  } catch (error) {
    console.error(
      "Erro inesperado ao finalizar ambiente 360°:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Ocorreu um erro inesperado ao cadastrar o ambiente.",
      },
      {
        status: 500,
      }
    );
  }
}
