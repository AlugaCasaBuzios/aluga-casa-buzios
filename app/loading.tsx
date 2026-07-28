export default function Loading() {
  return (
    <main className="min-h-screen animate-pulse bg-zinc-50">
      {/* Cabeçalho provisório */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-zinc-200" />

            <div className="space-y-2">
              <div className="h-5 w-48 rounded bg-zinc-200" />
              <div className="h-3 w-36 rounded bg-zinc-200" />
            </div>
          </div>

          <div className="hidden gap-4 sm:flex">
            <div className="h-10 w-20 rounded-full bg-zinc-200" />
            <div className="h-10 w-36 rounded-full bg-zinc-200" />
          </div>
        </div>
      </div>

      {/* Apresentação */}
      <section className="bg-blue-950 px-6 py-24">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto h-4 w-52 rounded bg-white/20" />

          <div className="mx-auto mt-7 h-12 max-w-3xl rounded bg-white/20" />

          <div className="mx-auto mt-4 h-12 max-w-2xl rounded bg-white/20" />

          <div className="mx-auto mt-8 h-5 max-w-xl rounded bg-white/15" />
        </div>
      </section>

      {/* Cards provisórios */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12">
          <div className="h-4 w-44 rounded bg-zinc-200" />
          <div className="mt-4 h-9 w-72 rounded bg-zinc-200" />
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="overflow-hidden rounded-3xl border border-zinc-200 bg-white"
            >
              <div className="h-72 bg-zinc-200" />

              <div className="space-y-5 p-7">
                <div className="h-7 w-3/4 rounded bg-zinc-200" />
                <div className="h-4 w-1/2 rounded bg-zinc-200" />

                <div className="flex gap-3">
                  <div className="h-8 w-24 rounded-full bg-zinc-200" />
                  <div className="h-8 w-20 rounded-full bg-zinc-200" />
                </div>

                <div className="h-12 w-full rounded-2xl bg-zinc-200" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="fixed inset-0 flex items-center justify-center bg-white/20 backdrop-blur-[1px]">
        <div className="rounded-2xl bg-white px-7 py-5 text-center shadow-2xl">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-sky-100 border-t-sky-700" />

          <p className="mt-4 font-bold text-blue-950">
            Carregando...
          </p>
        </div>
      </div>
    </main>
  );
}