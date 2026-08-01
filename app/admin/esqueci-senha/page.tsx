import Link from "next/link";

import { requestPasswordReset } from "./actions";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    erro?: string;
    enviado?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const { erro, enviado } =
    await searchParams;

  const errorMessage =
    erro === "campos"
      ? "Digite seu e-mail administrativo."
      : erro === "envio"
        ? "Não foi possível enviar o e-mail."
        : null;

  const emailSent = enviado === "1";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-900">
            Aluga Casa Búzios
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            Recuperar senha
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            Digite o e-mail cadastrado no
            painel administrativo.
          </p>
        </div>

        {emailSent ? (
          <div className="space-y-5">
            <p className="rounded-xl bg-green-50 px-4 py-4 text-sm font-medium text-green-800">
              E-mail enviado. Abra a mensagem
              mais recente para criar uma nova
              senha.
            </p>

            <p className="text-sm text-slate-600">
              Abra o link no mesmo navegador
              usado para solicitar a recuperação.
            </p>

            <Link
              href="/admin/login"
              className="block text-center font-semibold text-blue-900 hover:underline"
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form
            action={requestPasswordReset}
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

            {errorMessage && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-blue-950 px-5 py-3 font-bold text-white transition hover:bg-blue-900"
            >
              Enviar e-mail de recuperação
            </button>

            <Link
              href="/admin/login"
              className="block text-center text-sm font-semibold text-blue-900 hover:underline"
            >
              Voltar para o login
            </Link>
          </form>
        )}
      </section>
    </main>
  );
}