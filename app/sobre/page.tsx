import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

const benefits = [
  {
    icon: "🏠",
    title: "Imóveis selecionados",
    description:
      "Trabalhamos com propriedades escolhidas para proporcionar conforto, segurança e uma boa experiência em Búzios.",
  },
  {
    icon: "💬",
    title: "Atendimento direto",
    description:
      "Você conversa diretamente com nossa equipe pelo WhatsApp para tirar dúvidas e consultar disponibilidade.",
  },
  {
    icon: "📍",
    title: "Conhecimento local",
    description:
      "Conhecemos Búzios e ajudamos você a escolher uma casa adequada ao perfil da sua viagem.",
  },
  {
    icon: "🔒",
    title: "Mais segurança",
    description:
      "Apresentamos informações claras, fotos reais e orientações para uma reserva mais segura.",
  },
];

const numbers = [
  {
    value: "6+",
    label: "anos de experiência",
  },
  {
    value: "8",
    label: "imóveis no catálogo",
  },
  {
    value: "100%",
    label: "atendimento direto",
  },
  {
    value: "3",
    label: "idiomas no atendimento",
  },
];

const commitments = [
  {
    title: "Informações transparentes",
    description:
      "Características, comodidades, localização e regras apresentadas com clareza.",
  },
  {
    title: "Atendimento personalizado",
    description:
      "Orientação para encontrar a propriedade adequada às suas datas e necessidades.",
  },
  {
    title: "Suporte durante a hospedagem",
    description:
      "Comunicação direta para auxiliar antes e durante a estadia.",
  },
];

export default function SobrePage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-zinc-50">
        {/* Apresentação */}
        <section className="bg-blue-950 px-6 py-20 text-white sm:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-4xl">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-sky-300">
                Sobre a Aluga Casa Búzios
              </p>

              <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                Hospedagens selecionadas para você aproveitar o melhor de
                Búzios.
              </h1>

              <p className="mt-7 max-w-3xl text-lg leading-8 text-white/80 sm:text-xl">
                Ajudamos famílias, casais e grupos de amigos a encontrar casas
                de temporada com conforto, boas localizações e atendimento
                próximo durante toda a experiência.
              </p>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/casas"
                  style={{ color: "#ffffff" }}
                  className="inline-flex items-center justify-center rounded-full bg-sky-600 px-8 py-4 font-bold !text-white shadow-lg transition hover:-translate-y-1 hover:bg-sky-500"
                >
                  Conhecer as casas
                </Link>

                <a
                  href="https://wa.me/5524998288846?text=Olá! Gostaria de conhecer melhor o trabalho da Aluga Casa Búzios."
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#ffffff" }}
                  className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-8 py-4 font-bold !text-white transition hover:bg-white/20"
                >
                  Falar pelo WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Nossa história */}
        <section className="px-6 py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
                Nossa história
              </p>

              <h2 className="mt-4 text-3xl font-bold leading-tight text-blue-950 sm:text-4xl">
                Experiência em hospedagem e paixão por Búzios
              </h2>

              <div className="mt-6 space-y-5 text-lg leading-8 text-zinc-600">
                <p>
                  A Aluga Casa Búzios nasceu com o objetivo de facilitar o
                  encontro entre viajantes e boas casas de temporada em Armação
                  dos Búzios.
                </p>

                <p>
                  Há mais de seis anos trabalhamos com hospedagem, atendimento
                  aos hóspedes e apresentação de propriedades para diferentes
                  tipos de viagem.
                </p>

                <p>
                  Nosso propósito é oferecer informações claras, atendimento
                  humano e opções de hospedagem que permitam aproveitar Búzios
                  com mais tranquilidade.
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-7 shadow-xl sm:p-10">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
                Nosso compromisso
              </p>

              <h3 className="mt-4 text-3xl font-bold text-blue-950">
                Uma experiência simples e segura
              </h3>

              <div className="mt-8 space-y-5">
                {commitments.map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-sky-100 text-xl text-blue-950">
                      ✓
                    </span>

                    <div>
                      <p className="font-bold text-blue-950">{item.title}</p>

                      <p className="mt-1 leading-7 text-zinc-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Números */}
        <section className="bg-white px-6 py-16">
          <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {numbers.map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-zinc-200 bg-zinc-50 p-7 text-center"
              >
                <p className="text-4xl font-black text-sky-700">
                  {item.value}
                </p>

                <p className="mt-2 font-medium text-zinc-600">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Diferenciais */}
        <section className="px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
                Por que escolher a gente
              </p>

              <h2 className="mt-4 text-3xl font-bold text-blue-950 sm:text-4xl">
                Cuidado em cada etapa da sua viagem
              </h2>

              <p className="mt-5 text-lg leading-8 text-zinc-600">
                Da escolha da casa até o final da hospedagem, buscamos tornar
                todo o processo mais simples.
              </p>
            </div>

            <div className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((benefit) => (
                <article
                  key={benefit.title}
                  className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-2xl">
                    {benefit.icon}
                  </span>

                  <h3 className="mt-6 text-xl font-bold text-blue-950">
                    {benefit.title}
                  </h3>

                  <p className="mt-3 leading-7 text-zinc-600">
                    {benefit.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Chamada final */}
        <section className="px-6 pb-24">
          <div className="mx-auto max-w-6xl rounded-[2rem] bg-sky-50 px-7 py-14 text-center sm:px-12">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
              Planeje sua estadia
            </p>

            <h2 className="mt-4 text-3xl font-bold text-blue-950 sm:text-4xl">
              Encontre sua casa em Búzios
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-zinc-600">
              Consulte as propriedades disponíveis ou fale diretamente com
              nossa equipe para receber sugestões.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/casas"
                style={{ color: "#ffffff" }}
                className="inline-flex items-center justify-center rounded-full bg-blue-950 px-8 py-4 font-bold !text-white shadow-lg transition hover:-translate-y-1 hover:bg-blue-900"
              >
                Ver todas as casas
              </Link>

              <a
                href="https://wa.me/5524998288846?text=Olá! Gostaria de receber sugestões de casas para minha viagem a Búzios."
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#ffffff" }}
                className="inline-flex items-center justify-center rounded-full bg-green-600 px-8 py-4 font-bold !text-white shadow-lg transition hover:-translate-y-1 hover:bg-green-700"
              >
                Solicitar atendimento
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}