import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Contato",

  description:
    "Entre em contato com a Aluga Casa Búzios para consultar disponibilidade, valores e informações sobre casas de temporada em Búzios.",

  alternates: {
    canonical: "https://alugacasabuzios.com.br/contato",
  },

  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://alugacasabuzios.com.br/contato",
    title: "Contato | Aluga Casa Búzios",
    description:
      "Consulte casas de temporada em Búzios e receba atendimento direto pelo WhatsApp.",
  },

  robots: {
    index: true,
    follow: true,
  },
};

interface ContatoLayoutProps {
  children: ReactNode;
}

export default function ContatoLayout({
  children,
}: ContatoLayoutProps) {
  return children;
}