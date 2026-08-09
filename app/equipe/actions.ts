"use server";

import { redirect } from "next/navigation";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

export async function teamLogout() {
  const supabase =
    await createSupabaseServerClient();

  await supabase.auth.signOut();

  redirect("/equipe/login");
}
