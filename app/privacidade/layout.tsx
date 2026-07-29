import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Política de Privacidade",

  description:
    "Conheça a Política de Privacidade da Aluga Casa Búzios e saiba como tratamos dados, cookies e informações fornecidas pelos visitantes.",

  alternates: {
    canonical: "https://alugacasabuzios.com.br/privacidade",
  },

  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://alugacasabuzios.com.br/privacidade",
    title: "Política de Privacidade | Aluga Casa Búzios",
    description:
      "Informações sobre privacidade, cookies e tratamento de dados no site Aluga Casa Búzios.",
  },

  robots: {
    index: true,
    follow: true,
  },
};

interface PrivacidadeLayoutProps {
  children: ReactNode;
}

export default function PrivacidadeLayout({
  children,
}: PrivacidadeLayoutProps) {
  return children;
}