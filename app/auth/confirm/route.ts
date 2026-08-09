import type {
  EmailOtpType,
} from "@supabase/supabase-js";

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
  const { searchParams } =
    new URL(request.url);

  const tokenHash =
    searchParams.get("token_hash");

  const type =
    searchParams.get(
      "type"
    ) as EmailOtpType | null;

  const requestedNext =
    searchParams.get("next");

  const next =
    requestedNext?.startsWith("/")
      ? requestedNext
      : "/admin/redefinir-senha";

  const isTeamRecovery =
    next.startsWith("/equipe/");

  const redirectTo =
    request.nextUrl.clone();

  redirectTo.pathname = next;
  redirectTo.search = "";

  if (tokenHash && type) {
    const supabase =
      await createSupabaseServerClient();

    const { error } =
      await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });

    if (!error) {
      return NextResponse.redirect(
        redirectTo
      );
    }
  }

  redirectTo.pathname =
    isTeamRecovery
      ? "/equipe/login"
      : "/admin/login";

  redirectTo.search = "";
  redirectTo.searchParams.set(
    "erro",
    "recuperacao"
  );

  return NextResponse.redirect(
    redirectTo
  );
}
