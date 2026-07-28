"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  {
    label: "Início",
    href: "/",
  },
  {
    label: "Casas",
    href: "/casas",
  },
  {
    label: "Sobre",
    href: "/sobre",
  },
  {
    label: "Contato",
    href: "/contato",
  },
];

export default function Header() {
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    if (
      href === "/casas" &&
      pathname.startsWith("/imoveis/")
    ) {
      return true;
    }

    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-20 items-center justify-between gap-3 sm:h-24">
          {/* Marca */}
          <Link
            href="/"
            onClick={closeMobileMenu}
            className="flex min-w-0 items-center gap-3 sm:gap-4"
            aria-label="Página inicial da Aluga Casa Búzios"
          >
            <Image
              src="/images/logo/logo1.jpg"
              alt="Logo Aluga Casa Búzios"
              width={88}
              height={88}
              priority
              className="h-14 w-14 flex-none rounded-full object-cover shadow-md sm:h-20 sm:w-20"
            />

            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-xl font-extrabold text-blue-950 lg:text-2xl">
                Aluga Casa Búzios
              </p>

              <p className="truncate text-sm text-zinc-500">
                Casas de Temporada em Búzios
              </p>
            </div>
          </Link>

          {/* Navegação no computador */}
          <nav
            className="hidden items-center gap-2 lg:flex"
            aria-label="Navegação principal"
          >
            {navigation.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-3 font-semibold transition ${
                    active
                      ? "bg-sky-50 text-sky-700"
                      : "text-zinc-800 hover:bg-zinc-100 hover:text-sky-700"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Ações */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="https://instagram.com/aluga.casa.buzios"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir Instagram da Aluga Casa Búzios"
              className="hidden text-sm font-medium text-zinc-600 transition hover:text-pink-600 xl:block"
            >
              📸 @aluga.casa.buzios
            </a>

            <a
              href="https://wa.me/5524998288846?text=Olá! Gostaria de conhecer as casas disponíveis em Búzios."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-green-700 sm:px-5"
            >
              <span className="sm:hidden">
                WhatsApp
              </span>

              <span className="hidden sm:inline">
                Reservar pelo WhatsApp
              </span>
            </a>

            {/* Botão do menu no celular */}
            <button
              type="button"
              onClick={() =>
                setMobileMenuOpen((current) => !current)
              }
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              aria-label={
                mobileMenuOpen
                  ? "Fechar menu"
                  : "Abrir menu"
              }
              className="flex h-12 w-12 flex-none items-center justify-center rounded-full border border-zinc-200 bg-white text-blue-950 shadow-sm transition hover:bg-zinc-100 lg:hidden"
            >
              {mobileMenuOpen ? (
                <span
                  aria-hidden="true"
                  className="text-2xl"
                >
                  ✕
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className="flex flex-col gap-1.5"
                >
                  <span className="block h-0.5 w-6 rounded bg-current" />
                  <span className="block h-0.5 w-6 rounded bg-current" />
                  <span className="block h-0.5 w-6 rounded bg-current" />
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menu no celular */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-zinc-200 bg-white px-4 py-5 shadow-xl lg:hidden"
        >
          <nav
            className="mx-auto flex max-w-7xl flex-col gap-2"
            aria-label="Navegação no celular"
          >
            {navigation.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={`flex items-center justify-between rounded-2xl px-5 py-4 text-lg font-bold transition ${
                    active
                      ? "bg-sky-50 text-sky-700"
                      : "text-blue-950 hover:bg-zinc-100"
                  }`}
                >
                  <span>{item.label}</span>

                  <span aria-hidden="true">
                    →
                  </span>
                </Link>
              );
            })}

            <div className="mt-3 border-t border-zinc-200 pt-5">
              <a
                href="https://instagram.com/aluga.casa.buzios"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileMenu}
                className="flex items-center justify-center rounded-2xl border border-zinc-200 px-5 py-4 font-bold text-zinc-700 transition hover:bg-zinc-100 hover:text-pink-600"
              >
                📸 Acompanhar no Instagram
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}