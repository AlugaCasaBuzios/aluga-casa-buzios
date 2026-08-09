"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

export async function teamLogin(
  formData: FormData
) {
  const email = String(
    formData.get("email") ?? ""
  ).trim();

  const password = String(
    formData.get("password") ?? ""
  );

  if (!email || !password) {
    redirect(
      "/equipe/login?erro=campos"
    );
  }

  const supabase =
    await createSupabaseServerClient();

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    redirect(
      "/equipe/login?erro=login"
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/equipe/login?erro=login"
    );
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
    await supabase.auth.signOut();

    redirect(
      "/equipe/login?erro=acesso"
    );
  }

  revalidatePath("/", "layout");

  if (profile.role === "admin") {
    redirect("/admin");
  }

  redirect(
    "/equipe/manutencao"
  );
}
