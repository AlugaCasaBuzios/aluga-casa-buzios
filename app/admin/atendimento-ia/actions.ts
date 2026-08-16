"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isOpenAIConfigured } from "@/lib/ai/config";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getWhatsAppReadiness } from "@/lib/whatsapp/config";

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }
  return user;
}

function getRequiredText(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function finish(result: "salvo" | "erro", code?: string): never {
  revalidatePath("/admin/atendimento-ia");
  const query = code ? `${result}=1&codigo=${encodeURIComponent(code)}` : `${result}=1`;
  redirect(`/admin/atendimento-ia?${query}`);
}

export async function updateAiSettings(formData: FormData): Promise<void> {
  await getAuthenticatedUser();

  const aiEnabled = formData.get("ai_enabled") === "on";
  const autoReplyEnabled = formData.get("auto_reply_enabled") === "on";
  const maxMessages = Number(formData.get("max_messages_per_10_minutes"));
  const welcomeMessage = getRequiredText(formData, "welcome_message");
  const handoffMessage = getRequiredText(formData, "handoff_message");

  if (
    !Number.isInteger(maxMessages) ||
    maxMessages < 1 ||
    maxMessages > 30 ||
    welcomeMessage.length < 10 ||
    handoffMessage.length < 10
  ) {
    finish("erro", "campos");
  }

  if (aiEnabled && !isOpenAIConfigured()) {
    finish("erro", "openai");
  }

  if (autoReplyEnabled && (!isOpenAIConfigured() || !getWhatsAppReadiness().ready)) {
    finish("erro", "integracao");
  }

  const { error } = await createSupabaseAdminClient()
    .from("whatsapp_ai_settings")
    .upsert({
      id: 1,
      ai_enabled: aiEnabled,
      auto_reply_enabled: autoReplyEnabled,
      max_messages_per_10_minutes: maxMessages,
      welcome_message: welcomeMessage,
      handoff_message: handoffMessage,
    });

  if (error) {
    console.error("Erro ao atualizar atendimento com IA:", error);
    finish("erro", "banco");
  }
  finish("salvo");
}

export async function createKnowledgeEntry(formData: FormData): Promise<void> {
  const user = await getAuthenticatedUser();
  const category = getRequiredText(formData, "category") || "geral";
  const title = getRequiredText(formData, "title");
  const content = getRequiredText(formData, "content");
  const priorityValue = Number(formData.get("priority"));
  const priority = Number.isInteger(priorityValue) ? priorityValue : 100;

  if (title.length < 2 || content.length < 2) {
    finish("erro", "conhecimento");
  }

  const { error } = await createSupabaseAdminClient()
    .from("ai_knowledge_entries")
    .insert({
      category,
      title,
      content,
      priority,
      active: true,
      created_by: user.id,
    });

  if (error) {
    console.error("Erro ao cadastrar conhecimento:", error);
    finish("erro", "conhecimento");
  }
  finish("salvo");
}

export async function toggleKnowledgeEntry(formData: FormData): Promise<void> {
  await getAuthenticatedUser();
  const id = getRequiredText(formData, "id");
  const active = formData.get("active") === "true";
  if (!id) {
    finish("erro", "conhecimento");
  }

  const { error } = await createSupabaseAdminClient()
    .from("ai_knowledge_entries")
    .update({ active: !active })
    .eq("id", id);
  if (error) {
    console.error("Erro ao alterar conhecimento:", error);
    finish("erro", "conhecimento");
  }
  finish("salvo");
}

export async function acceptHandoff(formData: FormData): Promise<void> {
  const user = await getAuthenticatedUser();
  const id = getRequiredText(formData, "id");
  if (!id) {
    finish("erro", "transferencia");
  }

  const { error } = await createSupabaseAdminClient()
    .from("whatsapp_ai_handoffs")
    .update({
      status: "accepted",
      assigned_to: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending");
  if (error) {
    console.error("Erro ao assumir atendimento:", error);
    finish("erro", "transferencia");
  }
  finish("salvo");
}

export async function resolveHandoff(formData: FormData): Promise<void> {
  await getAuthenticatedUser();
  const id = getRequiredText(formData, "id");
  const conversationId = getRequiredText(formData, "conversation_id");
  if (!id || !conversationId) {
    finish("erro", "transferencia");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("whatsapp_ai_handoffs")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", id);

  if (!error) {
    await supabase
      .from("whatsapp_ai_conversations")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", conversationId);
  }

  if (error) {
    console.error("Erro ao encerrar atendimento:", error);
    finish("erro", "transferencia");
  }
  finish("salvo");
}
