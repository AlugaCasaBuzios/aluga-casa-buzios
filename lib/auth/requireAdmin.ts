import "server-only";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabaseServer";

/**
 * Garante que a sessão é de um administrador ativo.
 * O proxy já protege /admin; esta verificação
 * repete a checagem em ações que usam a chave
 * secreta do Supabase.
 */
export async function requireAdmin(): Promise<{
  userId: string;
}> {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile } = await supabase
    .from("management_users")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    !profile?.active ||
    profile.role !== "admin"
  ) {
    redirect("/admin/login?erro=acesso");
  }

  return {
    userId: user.id,
  };
}
