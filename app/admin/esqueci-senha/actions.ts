"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function requestPasswordReset(
  formData: FormData
) {
  const email = String(
    formData.get("email") ?? ""
  )
    .trim()
    .toLowerCase();

  if (!email) {
    redirect(
      "/admin/esqueci-senha?erro=campos"
    );
  }

  const requestHeaders = await headers();

  const origin =
    requestHeaders.get("origin") ??
    `http://${requestHeaders.get("host")}`;

  const supabase =
    await createSupabaseServerClient();

  const { error } =
    await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo:
          `${origin}/auth/callback` +
          "?next=/admin/redefinir-senha",
      }
    );

  if (error) {
    redirect(
      "/admin/esqueci-senha?erro=envio"
    );
  }

  redirect(
    "/admin/esqueci-senha?enviado=1"
  );
}