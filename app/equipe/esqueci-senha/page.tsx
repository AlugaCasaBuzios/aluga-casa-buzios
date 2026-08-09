import Link from "next/link";

import {
  requestTeamPasswordReset,
} from "./actions";

type TeamForgotPasswordPageProps = {
  searchParams: Promise<{
    erro?: string;
    enviado?: string;
  }>;
};

export default async function TeamForgotPasswordPage({
  searchParams,
}: TeamForgotPasswordPageProps) {
  const {
    erro,
    enviado,
  } = await searchParams;

  const errorMessage =
    erro === "campos"
      ? "Digite seu e-mail."
      : erro === "envio"
        ? "Não foi possível enviar o e-mail."
        : null;

  const emailSent =
    enviado === "1";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-700">
            Aluga Casa Búzios
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            Recuperar senha
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            Digite o e-mail cadastrado na área da equipe.
          </p>
        </div>

        {emailSent ? (
          <div className="space-y-5">
            <p className="rounded-xl bg-green-50 px-4 py-4 text-sm font-medium text-green-800">
              E-mail enviado. Abra a mensagem mais recente para criar uma nova senha.
            </p>

            <Link
              href="/equipe/login"
              className="block text-center font-semibold text-emerald-700 hover:underline"
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form
            action={requestTeamPasswordReset}
            className="space-y-5"
          >
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200"
              placeholder="funcionario@exemplo.com"
            />

            {errorMessage && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white transition hover:bg-emerald-800"
            >
              Enviar e-mail de recuperação
            </button>

            <Link
              href="/equipe/login"
              className="block text-center text-sm font-semibold text-emerald-700 hover:underline"
            >
              Voltar para o login
            </Link>
          </form>
        )}
      </section>
    </main>
  );
}
