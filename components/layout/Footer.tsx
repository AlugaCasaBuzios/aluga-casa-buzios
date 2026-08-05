import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-blue-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Marca */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-4"
              aria-label="Página inicial da Aluga Casa Búzios"
            >
              <Image
                src="/images/logo/logo1.jpg"
                alt="Logo Aluga Casa Búzios"
                width={76}
                height={76}
                className="h-16 w-16 rounded-full object-cover shadow-lg"
              />

              <div>
                <p className="text-xl font-black">
                  Aluga Casa Búzios
                </p>

                <p className="mt-1 text-sm text-white/60">
                  Casas de temporada
                </p>
              </div>
            </Link>

            <p className="mt-6 max-w-sm leading-7 text-white/70">
              Casas selecionadas para você aproveitar Armação dos Búzios com
              conforto, segurança e atendimento direto.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://instagram.com/aluga.casa.buzios"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram da Aluga Casa Búzios"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl transition hover:-translate-y-1 hover:bg-pink-600"
              >
                📸
              </a>

              <a
                href="https://wa.me/5524998288846?text=Olá! Gostaria de conhecer as casas disponíveis em Búzios."
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp da Aluga Casa Búzios"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl transition hover:-translate-y-1 hover:bg-green-600"
              >
                💬
              </a>

              <a
                href="mailto:contato@alugacasabuzios.com.br"
                aria-label="E-mail da Aluga Casa Búzios"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl transition hover:-translate-y-1 hover:bg-sky-600"
              >
                ✉️
              </a>
            </div>
          </div>

          {/* Navegação */}
          <div>
            <h2 className="text-lg font-bold">
              Navegação
            </h2>

            <nav className="mt-6 flex flex-col gap-4 text-white/70">
              <Link
                href="/"
                className="transition hover:translate-x-1 hover:text-white"
              >
                Início
              </Link>

              <Link
                href="/casas"
                className="transition hover:translate-x-1 hover:text-white"
              >
                Casas
              </Link>

              <Link
                href="/sobre"
                className="transition hover:translate-x-1 hover:text-white"
              >
                Sobre nós
              </Link>

              <Link
                href="/contato"
                className="transition hover:translate-x-1 hover:text-white"
              >
                Contato
              </Link>

              <Link
                href="/anuncie-conosco"
                className="font-bold text-sky-300 transition hover:translate-x-1 hover:text-white"
              >
                Anuncie conosco →
              </Link>

              <Link
                href="/privacidade"
                className="transition hover:translate-x-1 hover:text-white"
              >
                Política de Privacidade
              </Link>
            </nav>
          </div>

          {/* Atendimento */}
          <div>
            <h2 className="text-lg font-bold">
              Atendimento
            </h2>

            <div className="mt-6 space-y-5 text-white/70">
              <a
                href="https://wa.me/5524998288846"
                target="_blank"
                rel="noopener noreferrer"
                className="block transition hover:text-white"
              >
                <span className="block text-sm text-white/50">
                  WhatsApp
                </span>

                <span className="mt-1 block font-semibold">
                  (24) 99828-8846
                </span>
              </a>

              <a
                href="mailto:contato@alugacasabuzios.com.br"
                className="block break-words transition hover:text-white"
              >
                <span className="block text-sm text-white/50">
                  E-mail
                </span>

                <span className="mt-1 block font-semibold">
                  contato@alugacasabuzios.com.br
                </span>
              </a>

              <div>
                <span className="block text-sm text-white/50">
                  Horário
                </span>

                <span className="mt-1 block font-semibold">
                  Todos os dias, das 8h às 20h
                </span>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div>
            <h2 className="text-lg font-bold">
              Planeje sua viagem
            </h2>

            <p className="mt-6 leading-7 text-white/70">
              Consulte casas disponíveis para suas datas e quantidade de
              hóspedes.
            </p>

            <a
              href="https://wa.me/5524998288846?text=Olá! Gostaria de consultar casas disponíveis para minha viagem a Búzios."
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-green-700 px-6 py-3 font-bold text-white shadow-lg transition hover:-translate-y-1 hover:bg-green-800"
            >
              Consultar disponibilidade
            </a>

            <div className="mt-8 border-t border-white/10 pt-7">
              <h2 className="text-lg font-bold">
                Você possui um imóvel?
              </h2>

              <p className="mt-3 leading-7 text-white/70">
                Apresente sua casa para nossa equipe e conheça nosso trabalho de
                administração e divulgação.
              </p>

              <Link
                href="/anuncie-conosco"
                className="mt-5 inline-flex items-center justify-center rounded-full bg-sky-400 px-6 py-3 font-bold text-blue-950 shadow-lg transition hover:-translate-y-1 hover:bg-sky-300"
              >
                Anuncie conosco
              </Link>
            </div>
          </div>
        </div>

        {/* Parte inferior */}
        <div className="mt-14 flex flex-col gap-5 border-t border-white/10 pt-8 text-sm text-white/50 lg:flex-row lg:items-center lg:justify-between">
          <p>
            © {currentYear} Aluga Casa Búzios. Todos os direitos reservados.
          </p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <span>
              Armação dos Búzios — RJ
            </span>

            <span>
              alugacasabuzios.com.br
            </span>

            <Link
              href="/anuncie-conosco"
              className="font-semibold text-sky-300 transition hover:text-white"
            >
              Anuncie conosco
            </Link>

            <Link
              href="/privacidade"
              className="font-semibold text-white/70 transition hover:text-white"
            >
              Privacidade
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}