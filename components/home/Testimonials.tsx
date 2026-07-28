export default function Testimonials() {
  const reviews = [
    {
      name: "Mariana",
      city: "São Paulo",
      rating: 5,
      text:
        "A casa era exatamente como nas fotos. Atendimento excelente e localização perfeita.",
    },
    {
      name: "Carlos",
      city: "Belo Horizonte",
      rating: 5,
      text:
        "Foi uma das melhores hospedagens que já tivemos em Búzios. Voltaremos com certeza.",
    },
    {
      name: "Fernanda",
      city: "Rio de Janeiro",
      rating: 5,
      text:
        "Casa impecável, limpeza excelente e anfitrião extremamente atencioso.",
    },
  ];

  return (
    <section className="bg-white py-24">

      <div className="mx-auto max-w-7xl px-6">

        <h2 className="text-center text-4xl font-bold text-blue-950">
          O que nossos hóspedes dizem
        </h2>

        <p className="mt-4 mb-16 text-center text-gray-600">
          Avaliações reais de hóspedes que reservaram conosco.
        </p>

        <div className="grid gap-8 lg:grid-cols-3">

          {reviews.map((review) => (
            <div
              key={review.name}
              className="rounded-3xl bg-slate-50 p-8 shadow-lg"
            >
              <div className="mb-4 text-yellow-500 text-2xl">
                ⭐⭐⭐⭐⭐
              </div>

              <p className="leading-8 text-gray-700">
                "{review.text}"
              </p>

              <div className="mt-8">

                <h3 className="font-bold">
                  {review.name}
                </h3>

                <p className="text-gray-500">
                  {review.city}
                </p>

              </div>

            </div>
          ))}

        </div>

      </div>

    </section>
  );
}