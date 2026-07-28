"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Header() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  function navigateTo(path: string) {
    setMenuOpen(false);
    router.push(path);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-24 items-center justify-between gap-4">
          {/* Logo */}
          <button
            type="button"
            onClick={() => navigateTo("/")}
            className="flex min-w-0 items-center gap-3 text-left"
            aria-label="Voltar para a página inicial"
          >
            <Image
              src="/images/logo/logo1.jpg"
              alt="Logo Aluga Casa Búzios"
              width={88}
              height={88}
              priority
              className="h-16 w-16 flex-none rounded-full object-cover shadow-md sm:h-20 sm:w-20"
            />

            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-xl font-extrabold text-blue-950 lg:text-2xl">
                Aluga Casa Búzios
              </p>

              <p className="truncate text-sm text-gray-500">
                Casas de Temporada em Búzios
              </p>
            </div>
          </button>

          {/* Menu para computador */}
          <nav className="hidden items-center gap-8 font-semibold text-gray-900 lg:flex">
            <button
              type="button"
              onClick={() => navigateTo("/")}
              className="transition hover:text-sky-700"
            >
              Início
            </button>

            <button
              type="button"
              onClick={() => navigateTo("/casas")}
              className="transition hover:text-sky-700"
            >
              Casas
            </button>

            <button
              type="button"
              onClick={() => navigateTo("/sobre")}
              className="transition hover:text-sky-700"
            >
              Sobre
            </button>

            <button
              type="button"
              onClick={() => navigateTo("/contato")}
              className="transition hover:text-sky-700"
            >
              Contato
            </button>
          </nav>

          {/* Ações */}
          <div className="flex items-center gap-3">
            <a
              href="https://instagram.com/aluga.casa.buzios"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden text-sm font-medium text-gray-700 transition hover:text-pink-600 xl:block"
            >
              📸 @aluga.casa.buzios
            </a>

            <a
              href="https://wa.me/5524998288846?text=Olá! Gostaria de conhecer as casas disponíveis em Búzios."
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-full bg-green-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-green-700 sm:inline-flex"
            >
              Reservar pelo WhatsApp
            </a>

            {/* Botão do menu no celular */}
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-blue-950 shadow-sm transition hover:bg-gray-50 lg:hidden"
            >
              {menuOpen ? (
                <span className="text-2xl leading-none">✕</span>
              ) : (
                <span className="text-2xl leading-none">☰</span>
              )}
            </button>
          </div>
        </div>

        {/* Menu aberto no celular */}
        {menuOpen && (
          <div className="border-t border-gray-200 pb-5 pt-4 lg:hidden">
            <nav className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => navigateTo("/")}
                className="rounded-xl px-4 py-3 text-left font-semibold text-gray-900 transition hover:bg-sky-50 hover:text-sky-700"
              >
                Início
              </button>

              <button
                type="button"
                onClick={() => navigateTo("/casas")}
                className="rounded-xl px-4 py-3 text-left font-semibold text-gray-900 transition hover:bg-sky-50 hover:text-sky-700"
              >
                Casas
              </button>

              <button
                type="button"
                onClick={() => navigateTo("/sobre")}
                className="rounded-xl px-4 py-3 text-left font-semibold text-gray-900 transition hover:bg-sky-50 hover:text-sky-700"
              >
                Sobre
              </button>

              <button
                type="button"
                onClick={() => navigateTo("/contato")}
                className="rounded-xl px-4 py-3 text-left font-semibold text-gray-900 transition hover:bg-sky-50 hover:text-sky-700"
              >
                Contato
              </button>

              <a
                href="https://wa.me/5524998288846?text=Olá! Gostaria de conhecer as casas disponíveis em Búzios."
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 rounded-xl bg-green-600 px-4 py-3 text-center font-bold text-white shadow-md transition hover:bg-green-700 sm:hidden"
              >
                Reservar pelo WhatsApp
              </a>

              <a
                href="https://instagram.com/aluga.casa.buzios"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl px-4 py-3 text-center font-semibold text-pink-600 transition hover:bg-pink-50"
              >
                📸 Instagram
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}