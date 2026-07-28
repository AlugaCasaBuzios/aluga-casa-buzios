"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}

export default function ErrorPage({
  error,
  reset,
}: ErrorPageProps) {
  useEffect(() => {
    console.error("Erro no site:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center bg-zinc-50 px-6 py-20">
      <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-xl">
        <div className="grid items-center lg:grid-cols-2">
          <div className="p-8 sm:p-12">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-red-600">
              Ocorreu um problema
            </p>

            <h1 className="mt-4 text-4xl font-black leading-tight text-blue-950 sm:text-5xl">
              Não foi possível carregar esta página.
            </h1>

            <p className="mt-6 text-lg leading-8 text-zinc-600">
              Pode ter ocorrido uma falha temporária. Tente carregar novamente
              ou volte para a página inicial.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center rounded-full bg-blue-950 px-7 py-4 font-bold text-white shadow-lg transition hover:-translate-y-1 hover:bg-blue-900"
              >
                Tentar novamente
              </button>

              <a
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-blue-950 px-7 py-4 font-bold text-blue-950 transition hover:bg-blue-950 hover:text-white"
              >
                Voltar ao início
              </a>
            </div>

            <a
              href="https://wa.me/5524998288846?text=Olá! Encontrei um problema ao acessar o site da Aluga Casa Búzios."
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex font-bold text-green-700 transition hover:text-green-800"
            >
              Avisar pelo WhatsApp →
            </a>

            {error.digest && (
              <p className="mt-7 text-xs text-zinc-400">
                Código do erro: {error.digest}
              </p>
            )}
          </div>

          <div className="flex min-h-[420px] items-center justify-center bg-blue-950 p-10 text-center text-white">
            <div>
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-white/10 text-6xl shadow-xl">
                ⚠️
              </div>

              <p className="mt-8 text-3xl font-black text-sky-300">
                Estamos quase lá
              </p>

              <p className="mx-auto mt-4 max-w-sm leading-7 text-white/70">
                Uma nova tentativa geralmente resolve falhas temporárias de
                carregamento.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}