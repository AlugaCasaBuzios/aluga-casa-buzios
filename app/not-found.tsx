import Link from "next/link";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function NotFound() {
  return (
    <>
      <Header />

      <main className="flex min-h-[70vh] items-center bg-zinc-50 px-6 py-20">
        <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-xl">
          <div className="grid items-center lg:grid-cols-2">
            {/* Texto */}
            <div className="p-8 sm:p-12">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-sky-700">
                Erro 404
              </p>

              <h1 className="mt-4 text-4xl font-black leading-tight text-blue-950 sm:text-5xl">
                Esta página não foi encontrada.
              </h1>

              <p className="mt-6 text-lg leading-8 text-zinc-600">
                O endereço pode estar incorreto, a página pode ter sido movida
                ou este imóvel não está mais disponível.
              </p>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/"
                  style={{
                    color: "#ffffff",
                  }}
                  className="inline-flex items-center justify-center rounded-full bg-blue-950 px-7 py-4 font-bold text-white shadow-lg transition hover:-translate-y-1 hover:bg-blue-900"
                >
                  Voltar ao início
                </Link>

                <Link
                  href="/casas"
                  className="inline-flex items-center justify-center rounded-full border border-blue-950 px-7 py-4 font-bold text-blue-950 transition hover:bg-blue-950 hover:text-white"
                >
                  Ver todas as casas
                </Link>
              </div>

              <a
                href="https://wa.me/5524998288846?text=Olá! Não encontrei a página que procurava e gostaria de conhecer as casas disponíveis em Búzios."
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex font-bold text-green-700 transition hover:text-green-800"
              >
                Falar com a equipe pelo WhatsApp →
              </a>
            </div>

            {/* Área visual */}
            <div className="flex min-h-[380px] items-center justify-center bg-blue-950 p-10 text-center text-white">
              <div>
                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-white/10 text-6xl shadow-xl">
                  🏠
                </div>

                <p className="mt-8 text-8xl font-black text-sky-300">
                  404
                </p>

                <p className="mt-3 text-lg text-white/70">
                  Vamos ajudar você a encontrar o caminho certo.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
