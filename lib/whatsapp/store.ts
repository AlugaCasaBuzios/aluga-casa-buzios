import "server-only";

import type { AiToolEvent } from "@/lib/ai/propertyTools";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { WhatsAppInboundEvent } from "@/lib/whatsapp/webhookPayload";

export interface WhatsAppAiSettings {
  aiEnabled: boolean;
  autoReplyEnabled: boolean;
  maxMessagesPer10Minutes: number;
  welcomeMessage: string;
  handoffMessage: string;
}

export interface StoredConversationContext {
  contactId: string;
  conversationId: string;
  conversationStatus: "open" | "human" | "closed";
  optedOut: boolean;
  inserted: boolean;
}

type SettingsRow = {
  ai_enabled: boolean;
  auto_reply_enabled: boolean;
  max_messages_per_10_minutes: number;
  welcome_message: string;
  handoff_message: string;
};

type ContactRow = { id: string; opted_out: boolean };
type ConversationRow = {
  id: string;
  status: "open" | "human" | "closed";
};

export async function getWhatsAppAiSettings(): Promise<WhatsAppAiSettings> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("whatsapp_ai_settings")
    .select(
      "ai_enabled, auto_reply_enabled, max_messages_per_10_minutes, welcome_message, handoff_message"
    )
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("Erro ao carregar configurações do WhatsApp IA:", error);
    }
    return {
      aiEnabled: false,
      autoReplyEnabled: false,
      maxMessagesPer10Minutes: 8,
      welcomeMessage: "Olá! Sou a assistente virtual da Aluga Casa Búzios.",
      handoffMessage: "Vou encaminhar sua conversa para nossa equipe.",
    };
  }

  const row = data as SettingsRow;
  return {
    aiEnabled: row.ai_enabled,
    autoReplyEnabled: row.auto_reply_enabled,
    maxMessagesPer10Minutes: row.max_messages_per_10_minutes,
    welcomeMessage: row.welcome_message,
    handoffMessage: row.handoff_message,
  };
}

export async function hasProcessedMessage(messageId: string): Promise<boolean> {
  const { data } = await createSupabaseAdminClient()
    .from("whatsapp_ai_messages")
    .select("id")
    .eq("meta_message_id", messageId)
    .maybeSingle();
  return Boolean(data);
}

async function upsertContact(event: WhatsAppInboundEvent): Promise<ContactRow> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("whatsapp_ai_contacts")
    .upsert(
      {
        wa_id: event.from,
        display_name: event.profileName,
        last_message_at: new Date(Number(event.timestamp) * 1000).toISOString(),
      },
      { onConflict: "wa_id" }
    )
    .select("id, opted_out")
    .single();

  if (error) {
    throw new Error(`Não foi possível salvar o contato: ${error.message}`);
  }
  return data as ContactRow;
}

async function getOrCreateConversation(
  contactId: string,
  phoneNumberId: string
): Promise<ConversationRow> {
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: queryError } = await supabase
    .from("whatsapp_ai_conversations")
    .select("id, status")
    .eq("contact_id", contactId)
    .eq("meta_phone_number_id", phoneNumberId)
    .in("status", ["open", "human"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (queryError) {
    throw new Error(`Não foi possível consultar a conversa: ${queryError.message}`);
  }
  if (existing) {
    return existing as ConversationRow;
  }

  const { data, error } = await supabase
    .from("whatsapp_ai_conversations")
    .insert({
      contact_id: contactId,
      meta_phone_number_id: phoneNumberId,
    })
    .select("id, status")
    .single();

  if (!error && data) {
    return data as ConversationRow;
  }

  const { data: raced, error: racedError } = await supabase
    .from("whatsapp_ai_conversations")
    .select("id, status")
    .eq("contact_id", contactId)
    .eq("meta_phone_number_id", phoneNumberId)
    .in("status", ["open", "human"])
    .limit(1)
    .single();

  if (racedError) {
    throw new Error(`Não foi possível criar a conversa: ${error?.message}`);
  }
  return raced as ConversationRow;
}

export async function storeInboundEvent(
  event: WhatsAppInboundEvent
): Promise<StoredConversationContext> {
  if (await hasProcessedMessage(event.messageId)) {
    return {
      contactId: "",
      conversationId: "",
      conversationStatus: "closed",
      optedOut: false,
      inserted: false,
    };
  }

  const contact = await upsertContact(event);
  const conversation = await getOrCreateConversation(
    contact.id,
    event.phoneNumberId
  );
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("whatsapp_ai_messages").insert({
    conversation_id: conversation.id,
    meta_message_id: event.messageId,
    direction: "inbound",
    sender_type: "customer",
    message_type: event.messageType,
    content: event.text,
    raw_payload: event.rawMessage,
    created_at: new Date(Number(event.timestamp) * 1000).toISOString(),
  });

  if (error) {
    if (error.code === "23505") {
      return {
        contactId: contact.id,
        conversationId: conversation.id,
        conversationStatus: conversation.status,
        optedOut: contact.opted_out,
        inserted: false,
      };
    }
    throw new Error(`Não foi possível salvar a mensagem: ${error.message}`);
  }

  await supabase
    .from("whatsapp_ai_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversation.id);

  return {
    contactId: contact.id,
    conversationId: conversation.id,
    conversationStatus: conversation.status,
    optedOut: contact.opted_out,
    inserted: true,
  };
}

export async function storeOutboundMessage(input: {
  conversationId: string;
  metaMessageId?: string;
  senderType: "ai" | "human" | "system";
  content: string;
}): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from("whatsapp_ai_messages")
    .insert({
      conversation_id: input.conversationId,
      meta_message_id: input.metaMessageId || null,
      direction: "outbound",
      sender_type: input.senderType,
      message_type: "text",
      content: input.content,
    });
  if (error) {
    throw new Error(`Não foi possível salvar a resposta: ${error.message}`);
  }
}

export async function getConversationHistory(conversationId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("whatsapp_ai_messages")
    .select("sender_type, content")
    .eq("conversation_id", conversationId)
    .not("content", "is", null)
    .order("created_at", { ascending: false })
    .limit(14);
  if (error) {
    throw new Error(`Não foi possível carregar o histórico: ${error.message}`);
  }
  return ((data ?? []) as Array<{
    sender_type: "customer" | "ai" | "human" | "system";
    content: string;
  }>)
    .reverse()
    .map((row) => ({ senderType: row.sender_type, content: row.content }));
}

export async function countRecentInboundMessages(
  conversationId: string
): Promise<number> {
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count, error } = await createSupabaseAdminClient()
    .from("whatsapp_ai_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("direction", "inbound")
    .gte("created_at", since);
  if (error) {
    throw new Error(`Não foi possível verificar o limite: ${error.message}`);
  }
  return count ?? 0;
}

export async function hasOutboundMessages(conversationId: string): Promise<boolean> {
  const { count } = await createSupabaseAdminClient()
    .from("whatsapp_ai_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("direction", "outbound");
  return (count ?? 0) > 0;
}

export async function setContactOptedOut(
  contactId: string,
  optedOut: boolean
): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from("whatsapp_ai_contacts")
    .update({ opted_out: optedOut })
    .eq("id", contactId);
  if (error) {
    throw new Error(`Não foi possível atualizar a preferência: ${error.message}`);
  }
}

export async function requestConversationHandoff(input: {
  conversationId: string;
  reason: string;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("whatsapp_ai_conversations")
    .update({ status: "human", ai_enabled: false })
    .eq("id", input.conversationId);

  const { data: existing } = await supabase
    .from("whatsapp_ai_handoffs")
    .select("id")
    .eq("conversation_id", input.conversationId)
    .in("status", ["pending", "accepted"])
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("whatsapp_ai_handoffs").insert({
      conversation_id: input.conversationId,
      reason: input.reason,
    });
    if (error) {
      throw new Error(`Não foi possível criar a transferência: ${error.message}`);
    }
  }
}

export async function storeToolEvents(
  conversationId: string,
  events: AiToolEvent[]
): Promise<void> {
  if (events.length === 0) {
    return;
  }
  const { error } = await createSupabaseAdminClient()
    .from("whatsapp_ai_tool_events")
    .insert(
      events.map((event) => ({
        conversation_id: conversationId,
        tool_name: event.toolName,
        arguments: event.arguments,
        result: event.result,
        success: event.success,
      }))
    );
  if (error) {
    console.error("Não foi possível salvar eventos das ferramentas:", error);
  }
}
