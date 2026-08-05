import type {
  Metadata,
} from "next";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

import PropertyLeadForm from "@/components/property-management/PropertyLeadForm";

const siteUrl =
  "https://alugacasabuzios.com.br";

export const metadata: Metadata = {
  title:
    "Anuncie seu imóvel em Búzios",

  description:
    "Anuncie sua casa de temporada com a Aluga Casa Búzios. Administração, divulgação, atendimento aos hóspedes, precificação e gestão do imóvel.",

  alternates: {
    canonical:
      `${siteUrl}/anuncie-conosco`,
  },

  openGraph: {
    type: "website",
    locale: "pt_BR",

    url:
      `${siteUrl}/anuncie-conosco`,

    siteName:
      "Aluga Casa Búzios",

    title:
      "Anuncie seu imóvel em Búzios",

    description:
      "Conte com uma equipe experiente para divulgar, administrar e cuidar da sua casa de temporada em Búzios.",
  },

  robots: {
    index: true,
    follow: true,
  },
};

const benefits = [
  {
    title:
      "Divulgação profissional",

    description:
      "Apresentamos seu imóvel com fotos, descrição e informações organizadas para atrair os hóspedes certos.",
  },

  {
    title:
      "Atendimento aos hóspedes",

    description:
      "Acompanhamos dúvidas, solicitações e orientações desde o primeiro contato até o check-out.",
  },

  {
    title:
      "Gestão de preços e calendário",

    description:
      "Ajustamos valores, períodos especiais, disponibilidade e mínimo de noites conforme a demanda.",
  },

  {
    title:
      "Cuidado com o imóvel",

    description:
      "Organizamos preparação, limpeza, conferência e acompanhamento para oferecer uma hospedagem segura.",
  },
];

const managementSteps = [
  "Você envia as informações e fotos do imóvel.",

  "Nossa equipe analisa a propriedade e entra em contato.",

  "Conversamos sobre administração, divulgação e necessidades do imóvel.",

  "Com tudo aprovado, preparamos o imóvel para receber reservas.",
];

export default function AdvertiseWithUsPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-zinc-50">
        <section className="bg-blue-950 px-6 py-20 text-white sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-4xl">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-sky-300">
                Anuncie conosco
              </p>

              <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                Transforme seu imóvel em uma excelente oportunidade de renda
              </h1>

              <p className="mt-7 max-w-3xl text-lg leading-8 text-blue-100 sm:text-xl">
                A Aluga Casa Búzios cuida da divulgação, atendimento, calendário e experiência dos hóspedes para que você aproveite melhor o potencial da sua propriedade.
              </p>

              <a
                href="#formulario"
                className="mt-9 inline-flex items-center justify-center rounded-full bg-green-600 px-8 py-4 text-lg font-bold text-white shadow-xl transition hover:-translate-y-1 hover:bg-green-700"
              >
                Quero anunciar meu imóvel
              </a>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
                Administração de temporada
              </p>

              <h2 className="mt-3 text-3xl font-bold text-blue-950 sm:text-4xl">
                Seu imóvel bem apresentado, administrado e acompanhado
              </h2>

              <p className="mt-5 text-lg leading-8 text-zinc-600">
                Trabalhamos com casas de temporada em Armação dos Búzios e buscamos novas propriedades para ampliar nosso catálogo com qualidade, segurança e transparência.
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map(
                (
                  benefit,
                  index
                ) => (
                  <article
                    key={
                      benefit.title
                    }
                    className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-xl font-black text-sky-800">
                      {index + 1}
                    </div>

                    <h3 className="mt-5 text-xl font-bold text-blue-950">
                      {
                        benefit.title
                      }
                    </h3>

                    <p className="mt-3 leading-7 text-zinc-600">
                      {
                        benefit.description
                      }
                    </p>
                  </article>
                )
              )}
            </div>
          </div>
        </section>

        <section className="border-y border-zinc-200 bg-white px-6 py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
                Como funciona
              </p>

              <h2 className="mt-3 text-3xl font-bold text-blue-950 sm:text-4xl">
                Um processo simples e transparente
              </h2>

              <p className="mt-5 text-lg leading-8 text-zinc-600">
                O preenchimento do formulário não cria obrigação ou contrato. Ele permite que nossa equipe conheça melhor o imóvel antes do primeiro contato.
              </p>
            </div>

            <ol className="space-y-4">
              {managementSteps.map(
                (
                  step,
                  index
                ) => (
                  <li
                    key={step}
                    className="flex gap-4 rounded-2xl bg-zinc-50 p-5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-950 font-bold text-white">
                      {index + 1}
                    </span>

                    <p className="pt-1 leading-7 text-zinc-700">
                      {step}
                    </p>
                  </li>
                )
              )}
            </ol>
          </div>
        </section>

        <section
          id="formulario"
          className="scroll-mt-24 px-6 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-4xl">
            <div className="mb-10 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
                Conte sobre seu imóvel
              </p>

              <h2 className="mt-3 text-3xl font-bold text-blue-950 sm:text-4xl">
                Vamos conhecer sua propriedade
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-zinc-600">
                Preencha as informações disponíveis. Os campos com asterisco são obrigatórios e as fotos podem ser enviadas agora ou apresentadas posteriormente.
              </p>
            </div>

            <PropertyLeadForm />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}