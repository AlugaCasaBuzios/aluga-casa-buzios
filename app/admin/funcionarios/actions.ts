"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

function getTextValue(
  formData: FormData,
  fieldName: string
): string {
  const value =
    formData.get(fieldName);

  return typeof value === "string"
    ? value.trim()
    : "";
}

async function requireAdmin() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const {
    data: profile,
    error,
  } = await supabase
    .from("management_users")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    error ||
    !profile?.active ||
    profile.role !== "admin"
  ) {
    redirect("/equipe/manutencao");
  }

  return {
    supabase,
    user,
  };
}

export async function createStaffUser(
  formData: FormData
): Promise<void> {
  const fullName =
    getTextValue(
      formData,
      "fullName"
    );

  const email =
    getTextValue(
      formData,
      "email"
    ).toLowerCase();

  const password =
    getTextValue(
      formData,
      "password"
    );

  if (
    !fullName ||
    !email ||
    !password
  ) {
    redirect(
      "/admin/funcionarios?erro=campos"
    );
  }

  if (password.length < 8) {
    redirect(
      "/admin/funcionarios?erro=senha-curta"
    );
  }

  await requireAdmin();

  const adminSupabase =
    createSupabaseAdminClient();

  const {
    data,
    error,
  } =
    await adminSupabase.auth.admin.createUser(
      {
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      }
    );

  if (
    error ||
    !data.user
  ) {
    console.error(
      "Erro ao criar funcionário:",
      error
    );

    redirect(
      "/admin/funcionarios?erro=criar"
    );
  }

  const {
    error: profileError,
  } = await adminSupabase
    .from("management_users")
    .upsert(
      {
        user_id: data.user.id,
        full_name: fullName,
        role: "staff",
        active: true,
      },
      {
        onConflict: "user_id",
      }
    );

  if (profileError) {
    console.error(
      "Erro ao criar perfil do funcionário:",
      profileError
    );

    await adminSupabase.auth.admin.deleteUser(
      data.user.id
    );

    redirect(
      "/admin/funcionarios?erro=perfil"
    );
  }

  revalidatePath(
    "/admin/funcionarios"
  );

  redirect(
    "/admin/funcionarios?criado=1"
  );
}

export async function setStaffActive(
  formData: FormData
): Promise<void> {
  const userId =
    getTextValue(
      formData,
      "userId"
    );

  const activeValue =
    getTextValue(
      formData,
      "active"
    );

  if (
    !userId ||
    !["true", "false"].includes(
      activeValue
    )
  ) {
    redirect(
      "/admin/funcionarios?erro=usuario"
    );
  }

  const {
    user,
  } = await requireAdmin();

  if (user.id === userId) {
    redirect(
      "/admin/funcionarios?erro=proprio"
    );
  }

  const adminSupabase =
    createSupabaseAdminClient();

  const {
    data: target,
    error: targetError,
  } = await adminSupabase
    .from("management_users")
    .select("user_id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (
    targetError ||
    !target ||
    target.role !== "staff"
  ) {
    redirect(
      "/admin/funcionarios?erro=usuario"
    );
  }

  const {
    error,
  } = await adminSupabase
    .from("management_users")
    .update({
      active:
        activeValue === "true",
    })
    .eq("user_id", userId);

  if (error) {
    console.error(
      "Erro ao alterar acesso do funcionário:",
      error
    );

    redirect(
      "/admin/funcionarios?erro=atualizar"
    );
  }

  revalidatePath(
    "/admin/funcionarios"
  );

  redirect(
    "/admin/funcionarios?salvo=1"
  );
}

export async function setStaffPassword(
  formData: FormData
): Promise<void> {
  const userId =
    getTextValue(
      formData,
      "userId"
    );

  const password =
    getTextValue(
      formData,
      "password"
    );

  if (!userId) {
    redirect(
      "/admin/funcionarios?erro=usuario"
    );
  }

  if (password.length < 8) {
    redirect(
      "/admin/funcionarios?erro=senha-curta"
    );
  }

  await requireAdmin();

  const adminSupabase =
    createSupabaseAdminClient();

  const {
    data: target,
    error: targetError,
  } = await adminSupabase
    .from("management_users")
    .select("user_id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (
    targetError ||
    !target ||
    target.role !== "staff"
  ) {
    redirect(
      "/admin/funcionarios?erro=usuario"
    );
  }

  const {
    error,
  } =
    await adminSupabase.auth.admin.updateUserById(
      userId,
      {
        password,
      }
    );

  if (error) {
    console.error(
      "Erro ao redefinir senha do funcionário:",
      error
    );

    redirect(
      "/admin/funcionarios?erro=senha"
    );
  }

  redirect(
    "/admin/funcionarios?senha=1"
  );
}
