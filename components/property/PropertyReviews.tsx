interface PropertyReviewsProps {
  rating: number;
  reviewsCount: number;
}

export default function PropertyReviews({
  rating,
  reviewsCount,
}: PropertyReviewsProps) {
  return (
    <section className="mt-16">

      <h2 className="mb-8 text-3xl font-bold text-blue-950">
        Avaliações dos hóspedes
      </h2>

      <div className="rounded-3xl bg-white p-8 shadow-lg">

        <div className="flex flex-col items-center gap-2 md:flex-row md:justify-between">

          <div>

            <p className="text-5xl font-bold text-yellow-500">
              ⭐ {rating.toFixed(2)}
            </p>

            <p className="mt-2 text-lg text-gray-500">
              Baseado em {reviewsCount} avaliações
            </p>

          </div>

          <div className="text-right">

            <p className="text-lg font-semibold text-green-600">
              Excelente
            </p>

            <p className="text-gray-500">
              Avaliação média dos hóspedes
            </p>

          </div>

        </div>

        <div className="mt-10 space-y-4">

          <div>
            <div className="mb-1 flex justify-between">
              <span>Limpeza</span>
              <span>5.0</span>
            </div>

            <div className="h-2 rounded-full bg-gray-200">
              <div className="h-2 w-full rounded-full bg-yellow-400"></div>
            </div>
          </div>

          <div>
            <div className="mb-1 flex justify-between">
              <span>Localização</span>
              <span>4.9</span>
            </div>

            <div className="h-2 rounded-full bg-gray-200">
              <div className="h-2 w-[98%] rounded-full bg-yellow-400"></div>
            </div>
          </div>

          <div>
            <div className="mb-1 flex justify-between">
              <span>Comunicação</span>
              <span>5.0</span>
            </div>

            <div className="h-2 rounded-full bg-gray-200">
              <div className="h-2 w-full rounded-full bg-yellow-400"></div>
            </div>
          </div>

          <div>
            <div className="mb-1 flex justify-between">
              <span>Custo-benefício</span>
              <span>4.9</span>
            </div>

            <div className="h-2 rounded-full bg-gray-200">
              <div className="h-2 w-[98%] rounded-full bg-yellow-400"></div>
            </div>
          </div>

        </div>

      </div>

    </section>
  );
}