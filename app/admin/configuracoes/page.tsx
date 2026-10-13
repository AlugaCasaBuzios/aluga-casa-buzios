import Link from "next/link";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  getPriceReviewRecipients,
  getPropertiesPendingReview,
  PRICE_REVIEW_THRESHOLD_DAYS,
  type PropertyPendingReview,
} from "@/lib/pricing/priceReviewReminder";

import {
  savePriceReviewRecipients,
  sendPriceReviewReminderNow,
} from "./actions";

export const dynamic = "force-dynamic";

type SettingsPageProps = {
  searchParams: Promise<{
    salvo?: string;
    erro?: string;
    envio?: string;
  }>;
};

const sendMessages: Record<
  string,
  {
    text: string;
    ok: boolean;
  }
> = {
  sent: {
    text: "Lembrete enviado. Confira a caixa de entrada.",
    ok: true,
  },
  "nothing-to-review": {
    text: "Nada para enviar: todos os imóveis estão em dia.",
    ok: true,
  },
  "no-recipients": {
    text: "Cadastre ao menos um e-mail antes de enviar.",
    ok: false,
  },
  "not-configured": {
    text: "O envio de e-mails (Resend) não está configurado neste ambiente.",
    ok: false,
  },
  error: {
    text: "O envio falhou. Tente novamente em alguns minutos.",
    ok: false,
  },
};

const sourceLabels = {
  painel: "definidos nesta página",
  variavel:
    "vindos da variável PRICE_REVIEW_NOTIFICATION_EMAIL da Vercel",
  nenhum: "nenhum configurado",
};

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const { salvo, erro, envio } =
    await searchParams;

  await requireAdmin();

  const [{ recipients, source }, pending] =
    await Promise.all([
      getPriceReviewRecipients(),
      getPropertiesPendingReview().catch(
        (): PropertyPendingReview[] | null =>
          null
      ),
    ]);

  const sendMessage = envio
    ? sendMessages[envio]
    : undefined;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/precos"
          className="mb-6 inline-flex font-semibold text-blue-950 hover:underline"
        >
          ← Voltar para a revisão de preços
        </Link>

        <header className="mb-8 rounded-3xl bg-blue-950 p-8 text-white shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            Configurações
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Lembrete de revisão de preços
          </h1>

          <p className="mt-2 text-blue-100">
            Toda segunda-feira às 8h, um e-mail lista os imóveis com preços
            não conferidos há mais de {PRICE_REVIEW_THRESHOLD_DAYS} dias.
          </p>
        </header>

        {salvo === "1" && (
          <p className="mb-6 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
            Destinatários salvos.
          </p>
        )}

        {erro && (
          <p
            role="alert"
            className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            {erro === "emails"
              ? "Nenhum e-mail válido foi encontrado no texto informado."
              : "Não foi possível salvar. Tente novamente."}
          </p>
        )}

        {sendMessage && (
          <p
            className={`mb-6 rounded-xl px-4 py-3 text-sm font-semibold ${
              sendMessage.ok
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            {sendMessage.text}
          </p>
        )}

        <section className="mb-8 rounded-3xl bg-white p-6 shadow-lg sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            Quem recebe
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Destinatários atuais ({sourceLabels[source]}):{" "}
            <strong>
              {recipients.length > 0
                ? recipients.join(", ")
                : "nenhum"}
            </strong>
          </p>

          <form
            action={savePriceReviewRecipients}
            className="mt-5 space-y-4"
          >
            <label
              htmlFor="recipients"
              className="block font-semibold text-slate-800"
            >
              E-mails (um por linha)
            </label>

            <textarea
              id="recipients"
              name="recipients"
              rows={3}
              defaultValue={
                source === "painel"
                  ? recipients.join("\n")
                  : ""
              }
              placeholder="voce@exemplo.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-200"
            />

            <p className="text-sm text-slate-500">
              Deixe em branco e salve para voltar a usar o e-mail definido na
              Vercel.
            </p>

            <button
              type="submit"
              className="rounded-xl bg-blue-950 px-6 py-3 font-bold text-white transition hover:bg-blue-900"
            >
              Salvar destinatários
            </button>
          </form>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-lg sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            O que seria enviado hoje
          </h2>

          {pending === null ? (
            <p className="mt-3 text-red-700">
              Não foi possível consultar os imóveis.
            </p>
          ) : pending.length === 0 ? (
            <p className="mt-3 text-green-800">
              Todos os imóveis foram conferidos nos últimos{" "}
              {PRICE_REVIEW_THRESHOLD_DAYS} dias.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {pending.map((property) => (
                <li key={property.id}>
                  <Link
                    href={`/admin/precos/${encodeURIComponent(
                      property.id
                    )}`}
                    className="font-semibold text-blue-900 hover:underline"
                  >
                    {property.name}
                  </Link>{" "}
                  <span className="text-sm text-slate-500">
                    {property.daysSinceReview === null
                      ? "nunca conferido"
                      : `conferido há ${property.daysSinceReview} dias`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <form
            action={sendPriceReviewReminderNow}
            className="mt-6"
          >
            <button
              type="submit"
              className="rounded-xl border border-slate-300 px-6 py-3 font-bold text-slate-800 transition hover:bg-slate-50"
            >
              Enviar lembrete agora
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
