export default function WhyChooseUs() {
  const items = [
    {
      icon: "🏡",
      title: "Casas Selecionadas",
      text: "Todos os imóveis são verificados e fotografados pela nossa equipe.",
    },
    {
      icon: "💬",
      title: "Atendimento Rápido",
      text: "Suporte via WhatsApp antes, durante e depois da hospedagem.",
    },
    {
      icon: "🔑",
      title: "Check-in Fácil",
      text: "Entrada simples, rápida e segura.",
    },
    {
      icon: "⭐",
      title: "Avaliações Reais",
      text: "Somente hóspedes que reservaram podem avaliar.",
    },
  ];

  return (
    <section className="bg-slate-50 py-24">

      <div className="mx-auto max-w-7xl px-6">

        <h2 className="mb-4 text-center text-4xl font-bold text-blue-950">
          Por que reservar conosco?
        </h2>

        <p className="mx-auto mb-16 max-w-2xl text-center text-gray-600">
          Mais de 6 anos conectando hóspedes às melhores casas de temporada em
          Búzios.
        </p>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">

          {items.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl bg-white p-8 shadow-lg transition hover:-translate-y-2 hover:shadow-2xl"
            >
              <div className="mb-6 text-5xl">
                {item.icon}
              </div>

              <h3 className="mb-3 text-xl font-bold">
                {item.title}
              </h3>

              <p className="text-gray-600 leading-7">
                {item.text}
              </p>
            </div>
          ))}

        </div>

      </div>

    </section>
  );
}