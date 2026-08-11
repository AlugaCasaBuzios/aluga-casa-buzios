import {
  revalidatePath,
} from "next/cache";

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

type FinalizeLogoRequest = {
  tourId?: unknown;
  path?: unknown;
};

function isValidUuid(
  value: string
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isValidLogoPath(
  tourId: string,
  path: string
): boolean {
  return path.startsWith(
    `${tourId}/branding/`
  ) &&
    !path.includes("..") &&
    /\.(?:jpg|png|webp)$/i.test(
      path
    ) &&
    path.length <= 300;
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
            "Você não possui permissão para alterar o logotipo.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      (await request.json()) as
        FinalizeLogoRequest;

    const tourId =
      typeof body.tourId === "string"
        ? body.tourId.trim()
        : "";

    const path =
      typeof body.path === "string"
        ? body.path.trim()
        : "";

    if (
      !isValidUuid(tourId) ||
      !isValidLogoPath(
        tourId,
        path
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Os dados do logotipo são inválidos.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      createSupabaseAdminClient();

    const removeUploadedLogo =
      async () => {
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([
            path,
          ]);
      };

    const {
      data: tour,
      error: tourError,
    } = await supabase
      .from("virtual_tours")
      .select("id, slug, logo_path")
      .eq("id", tourId)
      .maybeSingle();

    if (tourError || !tour) {
      await removeUploadedLogo();

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

    const previousLogoPath =
      typeof tour.logo_path === "string"
        ? tour.logo_path
        : null;

    const {
      error: updateError,
    } = await supabase
      .from("virtual_tours")
      .update({
        logo_path: path,
      })
      .eq("id", tourId);

    if (updateError) {
      console.error(
        "Erro ao salvar logotipo do passeio:",
        updateError
      );

      await removeUploadedLogo();

      return NextResponse.json(
        {
          success: false,
          message:
            "O arquivo foi enviado, mas o logotipo não pôde ser salvo.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      previousLogoPath &&
      previousLogoPath !== path
    ) {
      const {
        error: storageError,
      } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([
          previousLogoPath,
        ]);

      if (storageError) {
        console.error(
          "Novo logotipo salvo, mas o arquivo anterior não pôde ser removido:",
          storageError
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
      message:
        "Logotipo atualizado com sucesso.",
    });
  } catch (error) {
    console.error(
      "Erro inesperado ao salvar logotipo do passeio:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Ocorreu um erro inesperado ao salvar o logotipo.",
      },
      {
        status: 500,
      }
    );
  }
}
