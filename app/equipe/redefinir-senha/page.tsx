import {
  updateTeamPassword,
} from "./actions";

type TeamResetPasswordPageProps = {
  searchParams: Promise<{
    erro?: string;
  }>;
};

export default async function TeamResetPasswordPage({
  searchParams,
}: TeamResetPasswordPageProps) {
  const { erro } =
    await searchParams;

  const errorMessage =
    erro === "senha-curta"
      ? "A senha precisa ter pelo menos 8 caracteres."
      : erro === "senhas-diferentes"
        ? "As duas senhas precisam ser iguais."
        : erro === "atualizacao"
          ? "Não foi possível atualizar a senha."
          : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-700">
            Aluga Casa Búzios
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            Criar nova senha
          </h1>
        </div>

        <form
          action={updateTeamPassword}
          className="space-y-5"
        >
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
            placeholder="Nova senha"
          />

          <input
            name="passwordConfirmation"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
            placeholder="Confirme a nova senha"
          />

          {errorMessage && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800"
          >
            Salvar nova senha
          </button>
        </form>
      </section>
    </main>
  );
}
