import type { Metadata } from "next";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ContactForm from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contato",
  description:
    "Entre em contato com a Aluga Casa Búzios e consulte casas disponíveis para sua viagem.",
};

const contactOptions = [
  {
    icon: "💬",
    title: "WhatsApp",
    description: "Atendimento direto para dúvidas e disponibilidade.",
    text: "(24) 99828-8846",
    href: "https://wa.me/5524998288846?text=Olá! Gostaria de conhecer as casas disponíveis em Búzios.",
  },
  {
    icon: "📧",
    title: "E-mail",
    description: "Envie sua dúvida ou solicitação de hospedagem.",
    text: "contato@alugacasabuzios.com.br",
    href: "mailto:contato@alugacasabuzios.com.br",
  },
  {
    icon: "📸",
    title: "Instagram",
    description: "Acompanhe novidades, imóveis e dicas de Búzios.",
    text: "@aluga.casa.buzios",
    href: "https://instagram.com/aluga.casa.buzios",
  },
];

export default function ContatoPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-zinc-50">
        <section className="bg-blue-950 px-6 py-20 text-center text-white sm:py-24">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-sky-300">
              Fale conosco
            </p>

            <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Vamos encontrar a casa ideal para sua viagem.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/80">
              Informe suas datas, a quantidade de hóspedes e o que procura.
              Nossa equipe apresentará as melhores opções disponíveis.
            </p>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto grid max-w-7xl items-start gap-12 lg:grid-cols-[1fr_1.15fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
                Canais de atendimento
              </p>

              <h2 className="mt-4 text-3xl font-bold text-blue-950 sm:text-4xl">
                Entre em contato
              </h2>

              <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-600">
                Escolha o canal mais conveniente. O atendimento pelo WhatsApp
                é a forma mais rápida de consultar disponibilidade.
              </p>

              <div className="mt-9 space-y-5">
                {contactOptions.map((option) => (
                  <a
                    key={option.title}
                    href={option.href}
                    target={
                      option.href.startsWith("http") ? "_blank" : undefined
                    }
                    rel={
                      option.href.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className="flex gap-5 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg"
                  >
                    <span className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-sky-100 text-2xl">
                      {option.icon}
                    </span>

                    <div>
                      <h3 className="text-xl font-bold text-blue-950">
                        {option.title}
                      </h3>

                      <p className="mt-1 leading-7 text-zinc-600">
                        {option.description}
                      </p>

                      <p className="mt-2 font-bold text-sky-700">
                        {option.text}
                      </p>
                    </div>
                  </a>
                ))}
              </div>

              <div className="mt-8 rounded-3xl bg-sky-50 p-7">
                <h3 className="text-xl font-bold text-blue-950">
                  Horário de atendimento
                </h3>

                <p className="mt-3 leading-7 text-zinc-600">
                  Atendimento todos os dias, das 8h às 20h. Mensagens recebidas
                  fora desse horário serão respondidas assim que possível.
                </p>
              </div>
            </div>

            <ContactForm />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}