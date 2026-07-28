import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";

import "./globals.css";

import WhatsAppButton from "@/components/layout/WhatsAppButton";

const siteUrl = "https://alugacasabuzios.com.br";

const googleAnalyticsId =
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Aluga Casa Búzios | Casas de Temporada",
    template: "%s | Aluga Casa Búzios",
  },

  description:
    "Casas de temporada em Armação dos Búzios com conforto, segurança, fotos reais e atendimento direto pelo WhatsApp.",

  keywords: [
    "casas de temporada em Búzios",
    "aluguel de casas em Búzios",
    "hospedagem em Búzios",
    "temporada em Búzios",
    "casa para alugar em Búzios",
    "Airbnb em Búzios",
    "Aluga Casa Búzios",
  ],

  authors: [
    {
      name: "Aluga Casa Búzios",
      url: siteUrl,
    },
  ],

  creator: "Aluga Casa Búzios",

  publisher: "Aluga Casa Búzios",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Aluga Casa Búzios",
    title: "Aluga Casa Búzios | Casas de Temporada",
    description:
      "Encontre casas de temporada em Búzios com conforto, segurança e atendimento direto.",
  },

  twitter: {
    card: "summary_large_image",
    title: "Aluga Casa Búzios | Casas de Temporada",
    description:
      "Encontre casas de temporada em Búzios com conforto, segurança e atendimento direto.",
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  category: "travel",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",

  "@id": `${siteUrl}/#organization`,

  name: "Aluga Casa Búzios",

  alternateName: "Aluga Casa Búzios — Casas de Temporada",

  url: siteUrl,

  logo: `${siteUrl}/images/logo/logo1.jpg`,

  image: `${siteUrl}/opengraph-image`,

  description:
    "Casas de temporada em Armação dos Búzios com atendimento direto, fotos reais e propriedades selecionadas.",

  email: "contato@alugacasabuzios.com.br",

  telephone: "+55 24 99828-8846",

  areaServed: {
    "@type": "City",
    name: "Armação dos Búzios",
    containedInPlace: {
      "@type": "State",
      name: "Rio de Janeiro",
    },
  },

  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+55 24 99828-8846",
    contactType: "customer service",
    availableLanguage: [
      "Portuguese",
      "Spanish",
      "English",
    ],
  },

  sameAs: [
    "https://instagram.com/aluga.casa.buzios",
    "https://www.airbnb.com.br/p/alugacasabuzios",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd).replace(
              /</g,
              "\\u003c"
            ),
          }}
        />

        {children}

        <WhatsAppButton />
      </body>

      {googleAnalyticsId && (
        <GoogleAnalytics gaId={googleAnalyticsId} />
      )}
    </html>
  );
}