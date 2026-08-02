interface PropertyReviewsProps {
  rating: number;
  reviewsCount: number;
}

function getRatingLabel(rating: number): string {
  if (rating >= 4.8) {
    return "Excelente";
  }

  if (rating >= 4.5) {
    return "Muito bom";
  }

  if (rating >= 4) {
    return "Bom";
  }

  return "Avaliado pelos hóspedes";
}

export default function PropertyReviews({
  rating,
  reviewsCount,
}: PropertyReviewsProps) {
  const hasReviews =
    reviewsCount > 0 && rating > 0;

  return (
    <section className="mt-16">
      <h2 className="mb-8 text-3xl font-bold text-blue-950">
        Avaliações dos hóspedes
      </h2>

      {hasReviews ? (
        <div className="rounded-3xl bg-white p-8 shadow-lg">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-5xl font-bold text-blue-950">
                <span
                  aria-hidden="true"
                  className="mr-3 text-yellow-500"
                >
                  ★
                </span>

                {rating.toFixed(2)}
              </p>

              <p className="mt-3 text-lg text-slate-600">
                Baseado em{" "}
                <strong className="text-slate-900">
                  {reviewsCount}
                </strong>{" "}
                {reviewsCount === 1
                  ? "avaliação"
                  : "avaliações"}
              </p>
            </div>

            <div className="rounded-2xl bg-green-50 px-6 py-5 md:text-right">
              <p className="text-xl font-bold text-green-700">
                {getRatingLabel(rating)}
              </p>

              <p className="mt-1 text-slate-600">
                Avaliação média dos hóspedes
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <div
              className="text-2xl tracking-widest text-yellow-500"
              aria-label={`Avaliação ${rating.toFixed(
                2
              )} de 5`}
            >
              ★★★★★
            </div>

            <p className="mt-3 max-w-2xl text-slate-600">
              As avaliações ajudam futuros hóspedes
              a escolher uma acomodação com mais
              segurança e tranquilidade.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-blue-100 bg-blue-50 p-8 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div
              aria-hidden="true"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm"
            >
              ✨
            </div>

            <div>
              <h3 className="text-xl font-bold text-blue-950">
                Imóvel novo no nosso catálogo
              </h3>

              <p className="mt-2 text-slate-600">
                Ainda não há avaliações publicadas
                para este imóvel. As informações e
                fotos foram verificadas pela equipe
                Aluga Casa Búzios.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}