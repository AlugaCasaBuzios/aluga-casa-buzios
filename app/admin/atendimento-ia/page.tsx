import Link from "next/link";
import { redirect } from "next/navigation";

import { isOpenAIConfigured } from "@/lib/ai/config";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getWhatsAppReadiness } from "@/lib/whatsapp/config";

import {
  acceptHandoff,
  createKnowledgeEntry,
  resolveHandoff,
  toggleKnowledgeEntry,
  updateAiSettings,
} from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ salvo?: string; erro?: string; codigo?: string }>;
};

type SettingsRow = {
  ai_enabled: boolean;
  auto_reply_enabled: boolean;
  max_messages_per_10_minutes: number;
  welcome_message: string;
  handoff_message: string;
};

type KnowledgeRow = {
  id: string;
  category: string;
  title: string;
  content: string;
  active: boolean;
  priority: number;
};

type HandoffRow = {
  id: string;
  conversation_id: string;
  status: "pending" | "accepted";
  reason: string;
  requested_at: string;
};

type ConversationRow = { id: string; contact_id: string };
type ContactRow = { id: string; wa_id: string; display_name: string | null };

const DEFAULT_SETTINGS: SettingsRow = {
  ai_enabled: false,
  auto_reply_enabled: false,
  max_messages_per_10_minutes: 8,
  welcome_message:
    "Olá! Sou a assistente virtual da Aluga Casa Búzios. Posso ajudar a encontrar casas, consultar datas e preparar uma estimativa. Um atendente humano pode assumir a conversa quando necessário.",
  handoff_message:
    "Vou encaminhar sua conversa para nossa equipe. O atendimento humano continuará por este WhatsApp assim que possível.",
};

function statusCard(label: string, ready: boolean, detail: string) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        ready
          ? "border-emerald-200 bg-emerald-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <p className="font-bold text-slate-950">{label}</p>
      <p className={`mt-1 text-sm ${ready ? "text-emerald-800" : "text-amber-800"}`}>
        {ready ? "Pronto" : "Pendente"} — {detail}
      </p>
    </div>
  );
}

function errorMessage(code?: string): string {
  switch (code) {
    case "openai":
      return "Cadastre a chave da OpenAI antes de habilitar a IA.";
    case "integracao":
      return "Configure todas as credenciais da OpenAI e da Meta antes de ativar respostas automáticas.";
    case "campos":
      return "Revise as mensagens e o limite informado.";
    case "banco":
      return "Não foi possível salvar. Confirme se a migração foi executada no Supabase.";
    case "conhecimento":
      return "Não foi possível alterar a base de conhecimento.";
    case "transferencia":
      return "Não foi possível alterar o atendimento humano.";
    default:
      return "Não foi possível concluir a operação.";
  }
}

export default async function AtendimentoIaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) {
    redirect("/admin/login");
  }

  const supabase = createSupabaseAdminClient();
  const [settingsResult, knowledgeResult, handoffsResult] = await Promise.all([
    supabase.from("whatsapp_ai_settings").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("ai_knowledge_entries")
      .select("id, category, title, content, active, priority")
      .order("priority", { ascending: true })
      .order("title", { ascending: true }),
    supabase
      .from("whatsapp_ai_handoffs")
      .select("id, conversation_id, status, reason, requested_at")
      .in("status", ["pending", "accepted"])
      .order("requested_at", { ascending: false })
      .limit(30),
  ]);

  const databaseReady = !settingsResult.error;
  const settings = (settingsResult.data as SettingsRow | null) ?? DEFAULT_SETTINGS;
  const knowledge = (knowledgeResult.data ?? []) as KnowledgeRow[];
  const handoffs = (handoffsResult.data ?? []) as HandoffRow[];

  const conversationIds = handoffs.map((item) => item.conversation_id);
  let conversations: ConversationRow[] = [];
  if (conversationIds.length > 0) {
    const { data } = await supabase
      .from("whatsapp_ai_conversations")
      .select("id, contact_id")
      .in("id", conversationIds);
    conversations = (data ?? []) as ConversationRow[];
  }
  const contactIds = conversations.map((item) => item.contact_id);
  let contacts: ContactRow[] = [];
  if (contactIds.length > 0) {
    const { data } = await supabase
      .from("whatsapp_ai_contacts")
      .select("id, wa_id, display_name")
      .in("id", contactIds);
    contacts = (data ?? []) as ContactRow[];
  }

  const conversationById = new Map(conversations.map((row) => [row.id, row]));
  const contactById = new Map(contacts.map((row) => [row.id, row]));
  const openAiReady = isOpenAIConfigured();
  const whatsapp = getWhatsAppReadiness();
  const integrationReady = databaseReady && openAiReady && whatsapp.ready;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-3xl bg-blue-950 p-8 text-white shadow-lg">
          <Link href="/admin" className="text-sm font-bold text-sky-300 hover:text-white">
            ← Voltar ao painel
          </Link>
          <h1 className="mt-4 text-3xl font-black">Atendimento com IA no WhatsApp</h1>
          <p className="mt-3 max-w-3xl text-blue-100">
            A IA consulta o catálogo e o mesmo cálculo de preços do site. Reservas,
            descontos e situações sensíveis continuam dependendo de uma pessoa.
          </p>
        </header>

        {params.salvo && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 font-semibold text-emerald-800">
            Alteração salva com sucesso.
          </div>
        )}
        {params.erro && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 font-semibold text-red-800">
            {errorMessage(params.codigo)}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          {statusCard("Banco de dados", databaseReady, "tabelas e histórico")}
          {statusCard("OpenAI", openAiReady, "geração das respostas")}
          {statusCard("WhatsApp Meta", whatsapp.ready, "webhook e envio")}
        </section>

        <section className="rounded-3xl bg-white p-7 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-blue-950">Ativação e limites</h2>
              <p className="mt-2 text-slate-600">
                As respostas automáticas permanecem bloqueadas até todas as integrações estarem prontas.
              </p>
            </div>
            <span
              className={`rounded-full px-4 py-2 text-sm font-black ${
                settings.auto_reply_enabled
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {settings.auto_reply_enabled ? "Respondendo" : "Desativado"}
            </span>
          </div>

          <form action={updateAiSettings} className="mt-7 grid gap-6">
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-5">
              <input
                type="checkbox"
                name="ai_enabled"
                defaultChecked={settings.ai_enabled}
                className="mt-1 h-5 w-5"
              />
              <span>
                <strong className="block text-slate-950">Permitir uso da IA</strong>
                <span className="text-sm text-slate-600">Habilita o mecanismo, mas ainda não responde clientes sozinho.</span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-5">
              <input
                type="checkbox"
                name="auto_reply_enabled"
                defaultChecked={settings.auto_reply_enabled}
                disabled={!integrationReady}
                className="mt-1 h-5 w-5"
              />
              <span>
                <strong className="block text-slate-950">Responder automaticamente no WhatsApp</strong>
                <span className="text-sm text-slate-600">
                  {integrationReady
                    ? "Pode ser ativado após o teste com o número da Meta."
                    : "Complete os três itens de configuração acima."}
                </span>
              </span>
            </label>

            <div className="grid gap-5 lg:grid-cols-2">
              <label className="grid gap-2 font-bold text-slate-800">
                Mensagem inicial
                <textarea
                  name="welcome_message"
                  defaultValue={settings.welcome_message}
                  rows={5}
                  className="rounded-xl border border-slate-300 p-4 font-normal"
                  required
                />
              </label>
              <label className="grid gap-2 font-bold text-slate-800">
                Mensagem de transferência humana
                <textarea
                  name="handoff_message"
                  defaultValue={settings.handoff_message}
                  rows={5}
                  className="rounded-xl border border-slate-300 p-4 font-normal"
                  required
                />
              </label>
            </div>

            <label className="grid max-w-sm gap-2 font-bold text-slate-800">
              Máximo de mensagens em 10 minutos
              <input
                type="number"
                min={1}
                max={30}
                name="max_messages_per_10_minutes"
                defaultValue={settings.max_messages_per_10_minutes}
                className="rounded-xl border border-slate-300 p-3 font-normal"
                required
              />
            </label>

            <button
              type="submit"
              className="w-fit rounded-xl bg-blue-950 px-6 py-3 font-bold text-white hover:bg-blue-900"
            >
              Salvar configurações
            </button>
          </form>
        </section>

        <section className="rounded-3xl bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-black text-blue-950">Base de conhecimento</h2>
          <p className="mt-2 text-slate-600">
            Cadastre regras e respostas institucionais. Disponibilidade e valores nunca devem ser escritos aqui: eles vêm do sistema.
          </p>

          <form action={createKnowledgeEntry} className="mt-7 grid gap-4 rounded-2xl bg-slate-50 p-5 lg:grid-cols-6">
            <input name="category" placeholder="Categoria" className="rounded-xl border border-slate-300 p-3 lg:col-span-1" />
            <input name="title" placeholder="Título da informação" className="rounded-xl border border-slate-300 p-3 lg:col-span-2" required />
            <input name="priority" type="number" defaultValue={100} className="rounded-xl border border-slate-300 p-3 lg:col-span-1" aria-label="Prioridade" />
            <textarea name="content" placeholder="Conteúdo completo e objetivo" rows={3} className="rounded-xl border border-slate-300 p-3 lg:col-span-5" required />
            <button type="submit" className="rounded-xl bg-sky-600 px-5 py-3 font-bold text-white hover:bg-sky-700">
              Adicionar
            </button>
          </form>

          <div className="mt-6 grid gap-4">
            {knowledge.map((entry) => (
              <article key={entry.id} className={`rounded-2xl border p-5 ${entry.active ? "border-slate-200" : "border-slate-200 bg-slate-50 opacity-70"}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-sky-700">
                      {entry.category} · prioridade {entry.priority}
                    </p>
                    <h3 className="mt-2 text-lg font-bold text-slate-950">{entry.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-600">{entry.content}</p>
                  </div>
                  <form action={toggleKnowledgeEntry}>
                    <input type="hidden" name="id" value={entry.id} />
                    <input type="hidden" name="active" value={String(entry.active)} />
                    <button type="submit" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
                      {entry.active ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                </div>
              </article>
            ))}
            {knowledge.length === 0 && (
              <p className="rounded-2xl bg-amber-50 p-5 text-amber-800">
                Nenhuma informação encontrada. Execute a migração no Supabase.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-black text-blue-950">Atendimentos humanos pendentes</h2>
          <div className="mt-6 grid gap-4">
            {handoffs.map((handoff) => {
              const conversation = conversationById.get(handoff.conversation_id);
              const contact = conversation ? contactById.get(conversation.contact_id) : undefined;
              const phone = contact?.wa_id || "";
              return (
                <article key={handoff.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-black text-slate-950">{contact?.display_name || phone || "Cliente"}</p>
                      <p className="mt-1 text-sm text-slate-600">{handoff.reason}</p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-amber-800">
                        {handoff.status === "pending" ? "Aguardando atendente" : "Atendimento assumido"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {phone && (
                        <a href={`https://wa.me/${phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="rounded-xl bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700">
                          Abrir WhatsApp
                        </a>
                      )}
                      {handoff.status === "pending" && (
                        <form action={acceptHandoff}>
                          <input type="hidden" name="id" value={handoff.id} />
                          <button type="submit" className="rounded-xl bg-blue-950 px-4 py-2 font-bold text-white">Assumir</button>
                        </form>
                      )}
                      <form action={resolveHandoff}>
                        <input type="hidden" name="id" value={handoff.id} />
                        <input type="hidden" name="conversation_id" value={handoff.conversation_id} />
                        <button type="submit" className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700">Encerrar</button>
                      </form>
                    </div>
                  </div>
                </article>
              );
            })}
            {handoffs.length === 0 && (
              <p className="rounded-2xl bg-emerald-50 p-5 text-emerald-800">
                Nenhum atendimento humano pendente.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
