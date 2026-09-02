"use client";

import { useState } from "react";

const questions = [
  {
    question: "Como faço para consultar a disponibilidade de uma casa?",
    answer:
      "Informe as datas da viagem e a quantidade de hóspedes pelo WhatsApp. Nossa equipe verificará as propriedades disponíveis e enviará as melhores opções.",
  },
  {
    question: "As fotos dos imóveis são reais?",
    answer:
      "Sim. Trabalhamos com fotos reais das propriedades para que você conheça os ambientes antes de confirmar a hospedagem.",
  },
  {
    question: "Posso levar animais de estimação?",
    answer:
      "Algumas propriedades aceitam animais mediante consulta. Essa informação aparece nos detalhes de cada imóvel.",
  },
  {
    question: "Como funciona o pagamento da reserva?",
    answer:
      "As condições de pagamento são informadas durante o atendimento. Antes de qualquer pagamento, você receberá os dados completos da propriedade e da reserva.",
  },
  {
    question: "Qual é o horário de check-in e check-out?",
    answer:
      "Os horários podem variar conforme a propriedade. Geralmente, o check-in acontece após as 15h e o check-out até as 11h.",
  },
  {
    question: "A taxa de limpeza está incluída na diária?",
    answer:
      "A taxa de limpeza é apresentada separadamente quando aplicável. O valor completo da hospedagem é informado antes da confirmação.",
  },
  {
    question: "Posso reservar diretamente pelo site?",
    answer:
      "O site permite pesquisar e conhecer as propriedades. A confirmação da disponibilidade e da reserva é realizada diretamente com nossa equipe pelo WhatsApp.",
  },
  {
    question: "Vocês oferecem atendimento durante a hospedagem?",
    answer:
      "Sim. Nossa equipe permanece disponível para orientar os hóspedes antes e durante a estadia.",
  },
];

export default function FAQ() {
  const [openQuestion, setOpenQuestion] = useState<number | null>(0);

  function toggleQuestion(index: number) {
    setOpenQuestion((current) => (current === index ? null : index));
  }

  return (
    <section className="bg-zinc-50 px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
            Tire suas dúvidas
          </p>

          <h2 className="mt-4 text-3xl font-bold text-blue-950 sm:text-4xl">
            Perguntas frequentes
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-zinc-600">
            Confira as principais informações sobre reservas e hospedagens em
            Búzios.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {questions.map((item, index) => {
            const isOpen = openQuestion === index;

            return (
              <article
                key={item.question}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 transition hover:border-sky-200"
              >
                <button
                  type="button"
                  onClick={() => toggleQuestion(index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left sm:px-7"
                >
                  <span className="text-lg font-bold text-blue-950">
                    {item.question}
                  </span>

                  <span
                    aria-hidden="true"
                    className={`flex h-10 w-10 flex-none items-center justify-center rounded-full bg-sky-100 text-xl font-bold text-sky-700 transition ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-zinc-200 px-6 py-5 sm:px-7">
                    <p className="leading-7 text-zinc-600">
                      {item.answer}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="mt-12 rounded-[2rem] bg-sky-50 p-8 text-center sm:p-10">
          <h3 className="text-2xl font-bold text-blue-950">
            Ainda ficou com alguma dúvida?
          </h3>

          <p className="mx-auto mt-3 max-w-xl leading-7 text-zinc-600">
            Fale diretamente com nossa equipe e receba atendimento
            personalizado.
          </p>

          <a
            href="https://wa.me/5524998288846?text=Olá! Tenho uma dúvida sobre as casas de temporada em Búzios."
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex rounded-full bg-green-600 px-8 py-4 font-bold text-white shadow-lg transition hover:-translate-y-1 hover:bg-green-700"
          >
            Tirar dúvida pelo WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}