import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type PropertyManagementLead = {
  id: string;
  created_at: string;

  owner_name: string;
  owner_whatsapp: string;
  owner_email: string | null;

  property_name: string | null;
  property_type: string;
  neighborhood: string;
  city: string;
  state: string;

  maximum_guests: number | null;
  bedrooms: number | null;
  bathrooms: number | null;

  photo_count: number | null;
};

function formatDate(
  value: string
): string {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Data não informada";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone:
        "America/Sao_Paulo",
    }
  ).format(date);
}

function getWhatsAppUrl(
  whatsapp: string
): string {
  const digits =
    whatsapp.replace(
      /\D/g,
      ""
    );

  const number =
    digits.startsWith("55")
      ? digits
      : `55${digits}`;

  const message =
    "Olá! Recebemos sua proposta de imóvel pelo site da Aluga Casa Búzios e gostaríamos de conversar.";

  return (
    `https://wa.me/${number}` +
    `?text=${encodeURIComponent(
      message
    )}`
  );
}

export default async function PropostasPage() {
  const authSupabase =
    await createSupabaseServerClient();

  const {
    data: {
      user,
    },
  } =
    await authSupabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  /*
   * O cliente administrativo é
   * utilizado somente depois da
   * confirmação do usuário autenticado.
   */
  const supabase =
    createSupabaseAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "property_management_leads"
    )
    .select(`
      id,
      created_at,
      owner_name,
      owner_whatsapp,
      owner_email,
      property_name,
      property_type,
      neighborhood,
      city,
      state,
      maximum_guests,
      bedrooms,
      bathrooms,
      photo_count
    `)
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(200);

  if (error) {
    console.error(
      "Erro ao carregar propostas:",
      error
    );

    return (
      <main className="min-h-screen bg-slate-100 px-4 py-12">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-lg">
          <p className="text-sm font-bold uppercase tracking-widest text-red-600">
            Erro
          </p>

          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Não foi possível carregar as propostas
          </h1>

          <p className="mt-4 leading-7 text-slate-600">
            Verifique a conexão com o Supabase e tente novamente.
          </p>

          <Link
            href="/admin"
            className="mt-7 inline-flex rounded-xl bg-blue-950 px-6 py-3 font-bold text-white transition hover:bg-blue-900"
          >
            Voltar ao painel
          </Link>
        </div>
      </main>
    );
  }

  const leads =
    (data ?? []) as
      PropertyManagementLead[];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl bg-blue-950 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-300">
                Captação de imóveis
              </p>

              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                Propostas recebidas
              </h1>

              <p className="mt-3 max-w-2xl leading-7 text-blue-100">
                Consulte proprietários que desejam anunciar ou administrar seus
                imóveis com a Aluga Casa Búzios.
              </p>
            </div>

            <Link
              href="/admin"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 py-3 font-bold text-blue-950 shadow-sm transition hover:bg-blue-100"
            >
              Voltar ao painel
            </Link>
          </div>
        </header>

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-lg sm:p-8">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                Novos proprietários
              </h2>

              <p className="mt-2 text-slate-600">
                Propostas ordenadas da mais recente para a mais antiga.
              </p>
            </div>

            <div className="inline-flex w-fit rounded-full bg-sky-100 px-4 py-2 text-sm font-bold text-sky-800">
              {leads.length}{" "}
              {leads.length === 1
                ? "proposta"
                : "propostas"}
            </div>
          </div>

          {leads.length === 0 ? (
            <div className="py-16 text-center">
              <div
                aria-hidden="true"
                className="text-5xl"
              >
                🏠
              </div>

              <h3 className="mt-5 text-xl font-bold text-slate-950">
                Nenhuma proposta recebida
              </h3>

              <p className="mt-2 text-slate-600">
                As propostas enviadas pelo formulário aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {leads.map(
                (lead) => (
                  <article
                    key={lead.id}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-300 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-500">
                          Recebida em{" "}
                          {formatDate(
                            lead.created_at
                          )}
                        </p>

                        <h3 className="mt-2 text-2xl font-bold text-blue-950">
                          {lead.property_name ||
                            `${lead.property_type} em ${lead.neighborhood}`}
                        </h3>

                        <p className="mt-2 text-slate-600">
                          📍 {lead.neighborhood},{" "}
                          {lead.city} —{" "}
                          {lead.state}
                        </p>
                      </div>

                      <span className="inline-flex w-fit shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                        Nova proposta
                      </span>
                    </div>

                    <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                      <p className="text-sm text-slate-500">
                        Proprietário ou responsável
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-950">
                        {lead.owner_name}
                      </p>

                      <p className="mt-3 font-medium text-slate-700">
                        WhatsApp:{" "}
                        {lead.owner_whatsapp}
                      </p>

                      {lead.owner_email && (
                        <p className="mt-1 break-words text-slate-700">
                          E-mail:{" "}
                          {lead.owner_email}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl border border-slate-200 p-3 text-center">
                        <p className="text-xs text-slate-500">
                          Tipo
                        </p>

                        <p className="mt-1 font-bold text-slate-900">
                          {lead.property_type}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-3 text-center">
                        <p className="text-xs text-slate-500">
                          Hóspedes
                        </p>

                        <p className="mt-1 font-bold text-slate-900">
                          {lead.maximum_guests ??
                            "—"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-3 text-center">
                        <p className="text-xs text-slate-500">
                          Quartos
                        </p>

                        <p className="mt-1 font-bold text-slate-900">
                          {lead.bedrooms ??
                            "—"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-3 text-center">
                        <p className="text-xs text-slate-500">
                          Fotos
                        </p>

                        <p className="mt-1 font-bold text-slate-900">
                          {lead.photo_count ??
                            0}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <a
                        href={getWhatsAppUrl(
                          lead.owner_whatsapp
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-green-600 px-5 py-3 text-center font-bold text-white transition hover:bg-green-700"
                      >
                        Falar pelo WhatsApp
                      </a>

                      {lead.owner_email && (
                        <a
                          href={`mailto:${lead.owner_email}`}
                          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-blue-950 px-5 py-3 text-center font-bold text-blue-950 transition hover:bg-blue-950 hover:text-white"
                        >
                          Enviar e-mail
                        </a>
                      )}
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}