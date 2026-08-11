import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

import {
  createVirtualTour,
} from "../actions";

export const dynamic =
  "force-dynamic";

type NewTourPageProps = {
  searchParams: Promise<{
    erro?: string;
  }>;
};

type PropertyRecord = {
  id: string;
  title: string;
  active: boolean;
};

const inputClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

export default async function NewTourPage({
  searchParams,
}: NewTourPageProps) {
  const {
    erro,
  } = await searchParams;

  const authenticationClient =
    await createSupabaseServerClient();

  const {
    data: {
      user,
    },
  } =
    await authenticationClient.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const {
    data: isAdmin,
  } =
    await authenticationClient.rpc(
      "is_management_admin"
    );

  if (isAdmin !== true) {
    redirect("/admin");
  }

  const supabase =
    createSupabaseAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from("property_catalog")
    .select("id, title, active")
    .order("title", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Erro ao carregar imóveis para o passeio:",
      error
    );
  }

  const properties =
    (data ?? []) as
      PropertyRecord[];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="rounded-3xl bg-blue-950 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-300">
            Passeio virtual 360°
          </p>

          <h1 className="mt-2 text-3xl font-black">
            Cadastrar novo passeio
          </h1>

          <p className="mt-2 leading-7 text-blue-100">
            Primeiro cadastre os dados principais.
            Os ambientes e as imagens serão adicionados
            depois.
          </p>
        </header>

        {erro && (
          <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 px-5 py-4 font-bold text-red-800">
            {erro}
          </div>
        )}

        <form
          action={createVirtualTour}
          className="mt-6 space-y-7 rounded-3xl bg-white p-6 shadow-lg sm:p-8"
        >
          <div>
            <label
              htmlFor="property_id"
              className="font-bold text-slate-900"
            >
              Imóvel vinculado
            </label>

            <select
              id="property_id"
              name="property_id"
              defaultValue=""
              className={inputClassName}
            >
              <option value="">
                Selecione um imóvel ou deixe sem vínculo
              </option>

              {properties.map((property) => (
                <option
                  key={property.id}
                  value={property.id}
                >
                  {property.title}
                  {property.active
                    ? ""
                    : " — inativo"}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="title"
                className="font-bold text-slate-900"
              >
                Título do passeio *
              </label>

              <input
                id="title"
                name="title"
                type="text"
                required
                maxLength={150}
                placeholder="Ex.: Casa Doce Mar em 360°"
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="slug"
                className="font-bold text-slate-900"
              >
                Endereço do passeio
              </label>

              <input
                id="slug"
                name="slug"
                type="text"
                maxLength={100}
                placeholder="Ex.: casa-doce-mar"
                className={inputClassName}
              />

              <p className="mt-2 text-sm text-slate-500">
                Se deixar vazio, será criado pelo título.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="font-bold text-slate-900"
            >
              Descrição
            </label>

            <textarea
              id="description"
              name="description"
              rows={4}
              maxLength={2000}
              placeholder="Apresentação breve do imóvel e do passeio virtual."
              className={inputClassName}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label
                htmlFor="brand_name"
                className="font-bold text-slate-900"
              >
                Marca
              </label>

              <input
                id="brand_name"
                name="brand_name"
                type="text"
                defaultValue="Aluga Casa Búzios"
                maxLength={120}
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="contact_name"
                className="font-bold text-slate-900"
              >
                Nome do contato
              </label>

              <input
                id="contact_name"
                name="contact_name"
                type="text"
                maxLength={120}
                placeholder="Ex.: André"
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="contact_whatsapp"
                className="font-bold text-slate-900"
              >
                WhatsApp
              </label>

              <input
                id="contact_whatsapp"
                name="contact_whatsapp"
                type="tel"
                maxLength={25}
                placeholder="5524999999999"
                className={inputClassName}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
            <Link
              href="/admin/tours"
              style={{
                color: "#1e293b",
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-800 transition hover:bg-slate-100"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              style={{
                color: "#ffffff",
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-6 py-3 font-black text-white shadow-md transition hover:bg-blue-900"
            >
              Cadastrar passeio
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
