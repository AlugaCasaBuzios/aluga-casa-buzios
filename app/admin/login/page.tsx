import { login } from "./actions";

type AdminLoginPageProps = {
  searchParams: Promise<{
    erro?: string;
  }>;
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const { erro } = await searchParams;

  const errorMessage =
    erro === "campos"
      ? "Preencha o e-mail e a senha."
      : erro === "login"
        ? "E-mail ou senha incorretos."
        : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-900">
            Aluga Casa Búzios
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            Painel administrativo
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            Entre com seu e-mail e senha para
            gerenciar preços e regras.
          </p>
        </div>

        <form
          action={login}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              E-mail
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-200"
              placeholder="seuemail@exemplo.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Senha
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-200"
              placeholder="Digite sua senha"
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
            Entrar no painel
          </button>
        </form>
      </section>
    </main>
  );
}