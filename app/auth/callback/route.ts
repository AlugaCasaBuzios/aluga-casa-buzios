import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

export async function GET(
  request: NextRequest
) {
  const code =
    request.nextUrl.searchParams.get(
      "code"
    );

  const requestedNext =
    request.nextUrl.searchParams.get(
      "next"
    );

  const next =
    requestedNext?.startsWith("/")
      ? requestedNext
      : "/admin/redefinir-senha";

  const isTeamRecovery =
    next.startsWith("/equipe/");

  if (code) {
    const supabase =
      await createSupabaseServerClient();

    const { error } =
      await supabase.auth.exchangeCodeForSession(
        code
      );

    if (!error) {
      const redirectUrl =
        request.nextUrl.clone();

      redirectUrl.pathname = next;
      redirectUrl.search = "";

      const response =
        NextResponse.redirect(
          redirectUrl
        );

      response.headers.set(
        "Cache-Control",
        "private, no-store"
      );

      return response;
    }
  }

  const errorUrl =
    request.nextUrl.clone();

  errorUrl.pathname = isTeamRecovery
    ? "/equipe/login"
    : "/admin/login";

  errorUrl.search = "";
  errorUrl.searchParams.set(
    "erro",
    "recuperacao"
  );

  return NextResponse.redirect(
    errorUrl
  );
}
