"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function login(formData: FormData) {
  const email = String(
    formData.get("email") ?? ""
  ).trim();

  const password = String(
    formData.get("password") ?? ""
  );

  if (!email || !password) {
    redirect("/admin/login?erro=campos");
  }

  const supabase =
    await createSupabaseServerClient();

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    redirect("/admin/login?erro=login");
  }

  revalidatePath("/", "layout");
  redirect("/admin");
}