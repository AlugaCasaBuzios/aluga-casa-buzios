import {
  NextResponse,
  type NextRequest,
} from "next/server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(
  request: NextRequest
) {
  const code =
    request.nextUrl.searchParams.get("code");

  const requestedNext =
    request.nextUrl.searchParams.get("next");

  const next =
    requestedNext?.startsWith("/")
      ? requestedNext
      : "/admin/redefinir-senha";

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
        NextResponse.redirect(redirectUrl);

      response.headers.set(
        "Cache-Control",
        "private, no-store"
      );

      return response;
    }
  }

  const errorUrl = request.nextUrl.clone();

  errorUrl.pathname = "/admin/login";
  errorUrl.search = "";
  errorUrl.searchParams.set(
    "erro",
    "recuperacao"
  );

  return NextResponse.redirect(errorUrl);
}