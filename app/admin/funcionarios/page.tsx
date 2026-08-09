import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

import {
  createStaffUser,
  setStaffActive,
  setStaffPassword,
} from "./actions";

export const dynamic =
  "force-dynamic";

type StaffPageProps = {
  searchParams: Promise<{
    criado?: string;
    salvo?: string;
    senha?: string;
    erro?: string;
  }>;
};

type ManagementUser = {
  user_id: string;
  full_name: string | null;
  role: "admin" | "staff";
  active: boolean;
  created_at: string;
};

function getErrorMessage(
  error?: string
): string | null {
  switch (error) {
    case "campos":
      return "Preencha nome, e-mail e senha temporária.";
    case "senha-curta":
      return "A senha precisa ter pelo menos 8 caracteres.";
    case "criar":
      return "Não foi possível criar a conta. O e-mail pode já estar cadastrado.";
    case "perfil":
      return "A conta foi criada, mas o perfil interno falhou. A criação foi revertida.";
    case "usuario":
      return "O funcionário selecionado não foi encontrado.";
    case "proprio":
      return "Sua própria conta administrativa não pode ser desativada nesta tela.";
    case "atualizar":
      return "Não foi possível alterar o acesso do funcionário.";
    case "senha":
      return "Não foi possível redefinir a senha do funcionário.";
    default:
      return null;
  }
}

function formatDate(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
    }
  ).format(
    new Date(value)
  );
}

export default async function StaffAdminPage({
  searchParams,
}: StaffPageProps) {
  const {
    criado,
    salvo,
    senha,
    erro,
  } = await searchParams;

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
  } = await supabase
    .from("management_users")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    !profile?.active ||
    profile.role !== "admin"
  ) {
    redirect(
      "/equipe/manutencao"
    );
  }

  const adminSupabase =
    createSupabaseAdminClient();

  const [
    managementResult,
    authUsersResult,
  ] = await Promise.all([
    adminSupabase
      .from("management_users")
      .select(
        "user_id, full_name, role, active, created_at"
      )
      .order(
        "full_name",
        {
          ascending: true,
        }
      ),

    adminSupabase.auth.admin.listUsers(
      {
        page: 1,
        perPage: 1000,
      }
    ),
  ]);

  if (
    managementResult.error
  ) {
    console.error(
      "Erro ao carregar funcionários:",
      managementResult.error
    );
  }

  if (
    authUsersResult.error
  ) {
    console.error(
      "Erro ao carregar usuários do Auth:",
      authUsersResult.error
    );
  }

  const managementUsers =
    (managementResult.data ??
      []) as ManagementUser[];

  const authById = new Map(
    (
      authUsersResult.data
        ?.users ?? []
    ).map(
      (authUser) => [
        authUser.id,
        authUser,
      ]
    )
  );

  const staffUsers =
    managementUsers.filter(
      (managementUser) =>
        managementUser.role ===
        "staff"
    );

  const activeCount =
    staffUsers.filter(
      (staff) => staff.active
    ).length;

  const errorMessage =
    getErrorMessage(erro);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 rounded-3xl bg-blue-950 p-7 text-white shadow-lg">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                Aluga Casa Búzios
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Funcionários
              </h1>

              <p className="mt-2 text-blue-100">
                Contas com acesso somente à área operacional da equipe.
              </p>
            </div>

            <Link
              href="/admin"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/40 bg-blue-900 px-5 font-bold !text-white transition hover:bg-blue-800"
            >
              Voltar ao painel
            </Link>
          </div>
        </header>

        {criado === "1" && (
          <p className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-800">
            Funcionário criado com sucesso.
          </p>
        )}

        {salvo === "1" && (
          <p className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-800">
            Acesso atualizado com sucesso.
          </p>
        )}

        {senha === "1" && (
          <p className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-800">
            Senha temporária atualizada.
          </p>
        )}

        {errorMessage && (
          <p className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-semibold text-red-800">
            {errorMessage}
          </p>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">
              Funcionários
            </p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {staffUsers.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">
              Acessos ativos
            </p>
            <p className="mt-2 text-3xl font-black text-green-700">
              {activeCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">
              Desativados
            </p>
            <p className="mt-2 text-3xl font-black text-slate-700">
              {staffUsers.length -
                activeCount}
            </p>
          </div>
        </section>

        <section className="mb-8 rounded-3xl bg-white p-6 shadow-lg">
          <h2 className="text-xl font-bold text-slate-900">
            Cadastrar funcionário
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            A conta será criada como funcionário e não poderá acessar o painel administrativo.
          </p>

          <form
            action={createStaffUser}
            className="mt-6 grid gap-4 md:grid-cols-3"
          >
            <label className="text-sm font-bold text-slate-700">
              Nome
              <input
                name="fullName"
                required
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 font-normal text-slate-900"
                placeholder="Nome do funcionário"
              />
            </label>

            <label className="text-sm font-bold text-slate-700">
              E-mail
              <input
                name="email"
                type="email"
                required
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 font-normal text-slate-900"
                placeholder="funcionario@exemplo.com"
              />
            </label>

            <label className="text-sm font-bold text-slate-700">
              Senha temporária
              <input
                name="password"
                type="password"
                minLength={8}
                required
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 font-normal text-slate-900"
                placeholder="Mínimo de 8 caracteres"
              />
            </label>

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                className="min-h-12 rounded-xl bg-blue-950 px-7 font-bold text-white hover:bg-blue-900"
              >
                Criar acesso
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-lg">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900">
              Contas da equipe
            </h2>
          </div>

          {staffUsers.length === 0 ? (
            <div className="p-10 text-center text-slate-600">
              Nenhum funcionário cadastrado.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {staffUsers.map(
                (staff) => {
                  const authUser =
                    authById.get(
                      staff.user_id
                    );

                  return (
                    <article
                      key={staff.user_id}
                      className="grid gap-5 p-6 lg:grid-cols-[1.3fr_1fr_auto]"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black text-slate-900">
                            {staff.full_name ||
                              "Funcionário"}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              staff.active
                                ? "bg-green-100 text-green-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {staff.active
                              ? "Ativo"
                              : "Desativado"}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-600">
                          {authUser?.email ??
                            "E-mail não disponível"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Criado em{" "}
                          {formatDate(
                            staff.created_at
                          )}
                          {" • "}
                          Último acesso:{" "}
                          {formatDate(
                            authUser?.last_sign_in_at ??
                              null
                          )}
                        </p>
                      </div>

                      <form
                        action={setStaffPassword}
                        className="flex items-end gap-2"
                      >
                        <input
                          type="hidden"
                          name="userId"
                          value={staff.user_id}
                        />

                        <label className="min-w-0 flex-1 text-xs font-bold text-slate-600">
                          Nova senha temporária
                          <input
                            name="password"
                            type="password"
                            minLength={8}
                            required
                            className="mt-2 min-h-10 w-full rounded-lg border border-slate-300 px-3 font-normal text-slate-900"
                            placeholder="Mín. 8 caracteres"
                          />
                        </label>

                        <button
                          type="submit"
                          className="min-h-10 rounded-lg bg-slate-800 px-4 text-sm font-bold text-white"
                        >
                          Redefinir
                        </button>
                      </form>

                      <form
                        action={setStaffActive}
                        className="flex items-center"
                      >
                        <input
                          type="hidden"
                          name="userId"
                          value={staff.user_id}
                        />

                        <input
                          type="hidden"
                          name="active"
                          value={
                            staff.active
                              ? "false"
                              : "true"
                          }
                        />

                        <button
                          type="submit"
                          className={`min-h-11 rounded-xl px-5 font-bold ${
                            staff.active
                              ? "bg-red-50 text-red-700 hover:bg-red-100"
                              : "bg-green-100 text-green-800 hover:bg-green-200"
                          }`}
                        >
                          {staff.active
                            ? "Desativar acesso"
                            : "Reativar acesso"}
                        </button>
                      </form>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
