import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Casas de temporada em Búzios",

  description:
    "Conheça casas de temporada selecionadas em Armação dos Búzios, com fotos reais, informações completas e atendimento direto pelo WhatsApp.",

  alternates: {
    canonical: "/casas",
  },

  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/casas",
    title:
      "Casas de temporada em Búzios | Aluga Casa Búzios",
    description:
      "Encontre casas de temporada em Búzios para famílias e grupos, com atendimento direto e propriedades selecionadas.",
  },

  robots: {
    index: true,
    follow: true,
  },
};

interface CasasLayoutProps {
  children: ReactNode;
}

export default function CasasLayout({
  children,
}: CasasLayoutProps) {
  return children;
}