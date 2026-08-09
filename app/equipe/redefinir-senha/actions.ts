"use server";

import { redirect } from "next/navigation";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

export async function updateTeamPassword(
  formData: FormData
) {
  const password = String(
    formData.get("password") ?? ""
  );

  const passwordConfirmation =
    String(
      formData.get(
        "passwordConfirmation"
      ) ?? ""
    );

  if (password.length < 8) {
    redirect(
      "/equipe/redefinir-senha?erro=senha-curta"
    );
  }

  if (
    password !==
    passwordConfirmation
  ) {
    redirect(
      "/equipe/redefinir-senha?erro=senhas-diferentes"
    );
  }

  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/equipe/login?erro=recuperacao"
    );
  }

  const { error } =
    await supabase.auth.updateUser({
      password,
    });

  if (error) {
    redirect(
      "/equipe/redefinir-senha?erro=atualizacao"
    );
  }

  await supabase.auth.signOut();

  redirect(
    "/equipe/login?senha=alterada"
  );
}
