import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sobre a Aluga Casa Búzios",

  description:
    "Conheça a Aluga Casa Búzios, especializada em casas de temporada selecionadas, atendimento direto e hospedagens seguras em Armação dos Búzios.",

  alternates: {
    canonical: "https://alugacasabuzios.com.br/sobre",
  },

  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://alugacasabuzios.com.br/sobre",
    title: "Sobre a Aluga Casa Búzios",
    description:
      "Conheça nossa experiência com hospedagens de temporada, seleção de imóveis e atendimento personalizado em Búzios.",
  },

  robots: {
    index: true,
    follow: true,
  },
};

interface SobreLayoutProps {
  children: ReactNode;
}

export default function SobreLayout({
  children,
}: SobreLayoutProps) {
  return children;
}