import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import VirtualTourClientSubmitButton from "@/components/virtual-tour/VirtualTourClientSubmitButton";

import { createVirtualTourClient } from "../actions";

export const dynamic = "force-dynamic";

type NewClientPageProps = {
  searchParams: Promise<{
    erro?: string;
  }>;
};

type TourRecord = {
  id: string;
  title: string;
  status: string;
};

type ServiceTourRecord = {
  tour_id: string;
};

const inputClass =
  "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200";

export default async function NewVirtualTourClientPage({
  searchParams,
}: NewClientPageProps) {
  const { erro } = await searchParams;
  const authenticationClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authenticationClient.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: isAdmin } = await authenticationClient.rpc(
    "is_management_admin"
  );

  if (isAdmin !== true) {
    redirect("/admin");
  }

  const supabase = createSupabaseAdminClient();
  const [toursResult, servicesResult] = await Promise.all([
    supabase
      .from("virtual_tours")
      .select("id, title, status")
      .order("title", { ascending: true }),
    supabase.from("virtual_tour_services").select("tour_id"),
  ]);

  const assignedTourIds = new Set(
    ((servicesResult.data ?? []) as ServiceTourRecord[]).map(
      (service) => service.tour_id
    )
  );
  const availableTours = ((toursResult.data ?? []) as TourRecord[]).filter(
    (tour) => !assignedTourIds.has(tour.id)
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl bg-blue-950 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-300">
                Comercial dos passeios 360°
              </p>
              <h1 className="mt-2 text-3xl font-black">Novo cliente</h1>
              <p className="mt-2 text-blue-100">
                Cadastre o contato e, se desejar, já vincule o primeiro passeio.
              </p>
            </div>
            <Link
              href="/admin/clientes-tours"
              style={{ color: "#172554" }}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 font-bold text-blue-950 transition hover:bg-sky-100"
            >
              Voltar aos clientes
            </Link>
          </div>
        </header>

        {erro && (
          <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 px-5 py-4 font-bold text-red-900">
            {erro}
          </div>
        )}

        <form action={createVirtualTourClient} className="mt-6 space-y-6">
          <section className="rounded-3xl bg-white p-6 shadow-lg sm:p-8">
            <div className="border-b border-slate-200 pb-5">
              <h2 className="text-xl font-black text-blue-950">Dados do cliente</h2>
              <p className="mt-1 text-sm text-slate-600">
                O nome é obrigatório. Os demais dados podem ser completados depois.
              </p>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="font-bold text-slate-800">Nome do cliente *</span>
                <input
                  name="name"
                  required
                  maxLength={150}
                  autoComplete="name"
                  className={inputClass}
                  placeholder="Nome completo"
                />
              </label>
              <label className="block">
                <span className="font-bold text-slate-800">Empresa ou marca</span>
                <input
                  name="company_name"
                  maxLength={150}
                  autoComplete="organization"
                  className={inputClass}
                  placeholder="Nome comercial"
                />
              </label>
              <label className="block">
                <span className="font-bold text-slate-800">WhatsApp</span>
                <input
                  name="whatsapp"
                  inputMode="tel"
                  autoComplete="tel"
                  className={inputClass}
                  placeholder="(22) 99999-9999"
                />
              </label>
              <label className="block">
                <span className="font-bold text-slate-800">Telefone alternativo</span>
                <input
                  name="phone"
                  inputMode="tel"
                  autoComplete="tel-national"
                  className={inputClass}
                  placeholder="(22) 3333-3333"
                />
              </label>
              <label className="block">
                <span className="font-bold text-slate-800">E-mail</span>
                <input
                  name="email"
                  type="email"
                  maxLength={200}
                  autoComplete="email"
                  className={inputClass}
                  placeholder="cliente@empresa.com.br"
                />
              </label>
              <label className="block">
                <span className="font-bold text-slate-800">CPF ou CNPJ</span>
                <input
                  name="document"
                  maxLength={40}
                  className={inputClass}
                  placeholder="Somente para controle interno"
                />
              </label>
            </div>

            <label className="mt-5 block">
              <span className="font-bold text-slate-800">Observações do cliente</span>
              <textarea
                name="notes"
                rows={4}
                maxLength={3000}
                className={`${inputClass} py-3`}
                placeholder="Preferências, contatos e informações comerciais"
              />
            </label>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-lg sm:p-8">
            <div className="border-b border-slate-200 pb-5">
              <h2 className="text-xl font-black text-blue-950">
                Primeiro serviço (opcional)
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Selecione um passeio para registrar valor, vencimento e situação.
              </p>
            </div>

            {servicesResult.error ? (
              <p className="mt-6 rounded-xl bg-red-50 p-4 font-bold text-red-800">
                Execute a nova migração SQL antes de vincular um serviço.
              </p>
            ) : (
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="font-bold text-slate-800">Passeio 360°</span>
                  <select name="tour_id" className={inputClass} defaultValue="">
                    <option value="">Cadastrar somente o cliente</option>
                    {availableTours.map((tour) => (
                      <option key={tour.id} value={tour.id}>
                        {tour.title} · {tour.status === "published" ? "Publicado" : "Rascunho"}
                      </option>
                    ))}
                  </select>
                  {availableTours.length === 0 && (
                    <p className="mt-2 text-sm font-semibold text-amber-700">
                      Todos os passeios já estão vinculados. O cliente será cadastrado
                      sem serviço.
                    </p>
                  )}
                </label>
                <label className="block">
                  <span className="font-bold text-slate-800">Valor contratado</span>
                  <input
                    name="amount"
                    type="number"
                    min="0"
                    max="10000000"
                    step="0.01"
                    inputMode="decimal"
                    className={inputClass}
                    placeholder="0,00"
                  />
                </label>
                <label className="block">
                  <span className="font-bold text-slate-800">Vencimento</span>
                  <input name="due_date" type="date" className={inputClass} />
                </label>
                <label className="block">
                  <span className="font-bold text-slate-800">Pagamento</span>
                  <select name="payment_status" defaultValue="pending" className={inputClass}>
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                    <option value="overdue">Atrasado</option>
                    <option value="waived">Isento</option>
                  </select>
                </label>
                <label className="block">
                  <span className="font-bold text-slate-800">Situação do serviço</span>
                  <select name="service_status" defaultValue="active" className={inputClass}>
                    <option value="active">Ativo</option>
                    <option value="suspended">Suspenso</option>
                    <option value="canceled">Cancelado</option>
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <span className="font-bold text-slate-800">Tipo de cobrança</span>
                  <select name="billing_cycle" defaultValue="one_time" className={inputClass}>
                    <option value="one_time">Pagamento único</option>
                    <option value="monthly">Mensal</option>
                    <option value="annual">Anual</option>
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <span className="font-bold text-slate-800">Observações do serviço</span>
                  <textarea
                    name="service_notes"
                    rows={3}
                    maxLength={2000}
                    className={`${inputClass} py-3`}
                    placeholder="Condições comerciais e anotações sobre este passeio"
                  />
                </label>
              </div>
            )}
          </section>

          <VirtualTourClientSubmitButton />
        </form>
      </div>
    </main>
  );
}
