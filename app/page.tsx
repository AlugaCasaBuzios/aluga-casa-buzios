import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import HomeContent from "@/components/home/HomeContent";

import {
  getActiveProperties,
} from "@/lib/propertyCatalog";

export const dynamic =
  "force-dynamic";

export default async function Home() {
  const properties =
    await getActiveProperties();

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Aluga Casa Búzios",
    url: "https://alugacasabuzios.com.br",
    logo: "https://alugacasabuzios.com.br/icon.jpg",
    description:
      "Casas de temporada selecionadas em Armação dos Búzios, com atendimento direto e hospedagens seguras.",
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
      "https://www.instagram.com/aluga.casa.buzios",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            organizationSchema
          ).replace(
            /</g,
            "\\u003c"
          ),
        }}
      />

      <Header />

      <main className="min-h-screen bg-zinc-50">
        <HomeContent
          properties={properties}
        />
      </main>

      <Footer />
    </>
  );
}
