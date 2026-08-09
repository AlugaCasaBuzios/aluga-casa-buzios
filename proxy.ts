import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

function isPublicAdminRoute(
  pathname: string
): boolean {
  return (
    pathname === "/admin/login" ||
    pathname === "/admin/esqueci-senha" ||
    pathname === "/admin/redefinir-senha"
  );
}

function isPublicTeamRoute(
  pathname: string
): boolean {
  return (
    pathname === "/equipe/login" ||
    pathname === "/equipe/esqueci-senha" ||
    pathname === "/equipe/redefinir-senha"
  );
}

export async function proxy(
  request: NextRequest
) {
  let response = NextResponse.next({
    request,
  });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(
                name,
                value
              );
            }
          );

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({
              name,
              value,
              options,
            }) => {
              response.cookies.set(
                name,
                value,
                options
              );
            }
          );

          Object.entries(headers).forEach(
            ([name, value]) => {
              response.headers.set(
                name,
                value
              );
            }
          );
        },
      },
    }
  );

  const pathname =
    request.nextUrl.pathname;

  const isAdminArea =
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  const isTeamArea =
    pathname === "/equipe" ||
    pathname.startsWith("/equipe/");

  const isAdminApi =
    pathname.startsWith("/api/admin/");

  await supabase.auth.getClaims();

  if (
    (isAdminArea &&
      isPublicAdminRoute(pathname)) ||
    (isTeamArea &&
      isPublicTeamRoute(pathname))
  ) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  function redirectTo(
    destination: string
  ) {
    const url =
      request.nextUrl.clone();

    url.pathname = destination;
    url.search = "";

    const redirectResponse =
      NextResponse.redirect(url);

    response.cookies
      .getAll()
      .forEach(({ name, value }) => {
        redirectResponse.cookies.set(
          name,
          value
        );
      });

    return redirectResponse;
  }

  if (!user) {
    if (isAdminApi) {
      return NextResponse.json(
        {
          error: "Não autenticado.",
        },
        {
          status: 401,
        }
      );
    }

    if (isAdminArea) {
      return redirectTo(
        "/admin/login"
      );
    }

    if (isTeamArea) {
      return redirectTo(
        "/equipe/login"
      );
    }

    return response;
  }

  if (
    !isAdminArea &&
    !isTeamArea &&
    !isAdminApi
  ) {
    return response;
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
    !profile?.active
  ) {
    if (isAdminApi) {
      return NextResponse.json(
        {
          error:
            "Acesso não autorizado.",
        },
        {
          status: 403,
        }
      );
    }

    const loginPath =
      isTeamArea
        ? "/equipe/login"
        : "/admin/login";

    const url =
      request.nextUrl.clone();

    url.pathname = loginPath;
    url.search = "";
    url.searchParams.set(
      "erro",
      "acesso"
    );

    return NextResponse.redirect(
      url
    );
  }

  if (
    (isAdminArea || isAdminApi) &&
    profile.role !== "admin"
  ) {
    if (isAdminApi) {
      return NextResponse.json(
        {
          error:
            "Somente administradores podem acessar este recurso.",
        },
        {
          status: 403,
        }
      );
    }

    return redirectTo(
      "/equipe/manutencao"
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/equipe/:path*",
    "/api/admin/:path*",
  ],
};
