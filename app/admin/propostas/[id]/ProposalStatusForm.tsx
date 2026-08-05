import { redirect } from "next/navigation";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

import {
  updateProposal,
} from "./actions";

type ProposalStatusFormProps = {
  proposalId: string;
};

type ProposalManagementData = {
  status: string;
  internal_notes: string | null;
  updated_at: string;
};

const allowedStatuses = [
  "new",
  "contacted",
  "evaluating",
  "approved",
  "rejected",
] as const;

function isAllowedStatus(
  value: string
): value is
  (typeof allowedStatuses)[number] {
  return allowedStatuses.some(
    (status) => status === value
  );
}

function formatDateTime(
  value: string
): string {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Não informado";
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

export default async function ProposalStatusForm({
  proposalId,
}: ProposalStatusFormProps) {
  const authenticationClient =
    await createSupabaseServerClient();

  const {
    data: { user },
  } =
    await authenticationClient.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

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
      status,
      internal_notes,
      updated_at
    `)
    .eq("id", proposalId)
    .maybeSingle();

  if (error) {
    console.error(
      "Erro ao carregar gerenciamento da proposta:",
      error
    );

    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-lg">
        <h2 className="text-xl font-bold text-red-800">
          Não foi possível carregar o andamento
        </h2>

        <p className="mt-2 text-sm text-red-700">
          Atualize a página e tente novamente.
        </p>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  const proposalManagement =
    data as ProposalManagementData;

  const currentStatus =
    isAllowedStatus(
      proposalManagement.status
    )
      ? proposalManagement.status
      : "new";

  return (
    <section className="rounded-3xl bg-white p-6 shadow-lg">
      <p className="text-sm font-bold uppercase tracking-wider text-sky-700">
        Controle interno
      </p>

      <h2 className="mt-2 text-xl font-bold text-slate-900">
        Andamento da proposta
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        Atualize o estágio da negociação e registre
        observações que somente os administradores
        poderão visualizar.
      </p>

      <form
        action={updateProposal}
        className="mt-6 space-y-5"
      >
        <input
          type="hidden"
          name="proposal_id"
          value={proposalId}
        />

        <div>
          <label
            htmlFor="proposal-status"
            className="mb-2 block text-sm font-bold text-slate-800"
          >
            Status
          </label>

          <select
            id="proposal-status"
            name="status"
            defaultValue={currentStatus}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-600 focus:ring-4 focus:ring-sky-100"
          >
            <option value="new">
              Nova
            </option>

            <option value="contacted">
              Em contato
            </option>

            <option value="evaluating">
              Em avaliação
            </option>

            <option value="approved">
              Aprovada
            </option>

            <option value="rejected">
              Recusada
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="internal-notes"
            className="mb-2 block text-sm font-bold text-slate-800"
          >
            Anotações internas
          </label>

          <textarea
            id="internal-notes"
            name="internal_notes"
            defaultValue={
              proposalManagement.internal_notes ??
              ""
            }
            rows={7}
            maxLength={5000}
            placeholder="Exemplo: Entrei em contato, aguarda visita ao imóvel..."
            className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-100"
          />
        </div>

        <button
          type="submit"
          style={{
            color: "#172554",
          }}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-sky-300 px-5 py-3 font-bold shadow-sm transition hover:bg-sky-200"
        >
          Salvar andamento
        </button>
      </form>

      <p className="mt-4 text-xs text-slate-500">
        Última atualização:{" "}
        {formatDateTime(
          proposalManagement.updated_at
        )}
      </p>
    </section>
  );
}