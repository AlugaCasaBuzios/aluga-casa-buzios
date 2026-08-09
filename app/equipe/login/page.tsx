import Link from "next/link";

import {
  teamLogin,
} from "./actions";

type TeamLoginPageProps = {
  searchParams: Promise<{
    erro?: string;
    senha?: string;
  }>;
};

export default async function TeamLoginPage({
  searchParams,
}: TeamLoginPageProps) {
  const {
    erro,
    senha,
  } = await searchParams;

  const errorMessage =
    erro === "campos"
      ? "Preencha o e-mail e a senha."
      : erro === "login"
        ? "E-mail ou senha incorretos."
        : erro === "acesso"
          ? "Seu acesso à equipe está desativado. Procure o administrador."
          : erro === "recuperacao"
            ? "Não foi possível validar o link de recuperação."
            : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-700">
            Aluga Casa Búzios
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            Área da equipe
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            Acompanhe e atualize os chamados de manutenção.
          </p>
        </div>

        {senha === "alterada" && (
          <p className="mb-5 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            Senha alterada. Entre novamente.
          </p>
        )}

        <form
          action={teamLogin}
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
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200"
              placeholder="funcionario@exemplo.com"
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
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200"
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
            className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white transition hover:bg-emerald-800"
          >
            Entrar na área da equipe
          </button>

          <Link
            href="/equipe/esqueci-senha"
            className="block text-center text-sm font-semibold text-emerald-700 hover:underline"
          >
            Esqueci minha senha
          </Link>
        </form>

        <div className="mt-6 border-t border-slate-200 pt-6 text-center">
          <Link
            href="/admin/login"
            className="text-sm font-semibold text-blue-900 hover:underline"
          >
            Acesso administrativo
          </Link>
        </div>
      </section>
    </main>
  );
}
