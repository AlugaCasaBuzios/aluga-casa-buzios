import { updatePassword } from "./actions";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    erro?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { erro } = await searchParams;

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
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-900">
            Aluga Casa Búzios
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            Criar nova senha
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            Digite e confirme sua nova senha
            administrativa.
          </p>
        </div>

        <form
          action={updatePassword}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Nova senha
            </label>

            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-200"
              placeholder="Mínimo de 8 caracteres"
            />
          </div>

          <div>
            <label
              htmlFor="passwordConfirmation"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Confirme a nova senha
            </label>

            <input
              id="passwordConfirmation"
              name="passwordConfirmation"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-200"
              placeholder="Digite novamente"
            />
          </div>

          {errorMessage && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-950 px-5 py-3 font-bold text-white transition hover:bg-blue-900"
          >
            Salvar nova senha
          </button>
        </form>
      </section>
    </main>
  );
}