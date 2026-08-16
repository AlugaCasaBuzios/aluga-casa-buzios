import "server-only";

import { generateAssistantReply } from "@/lib/ai/assistant";
import { isOpenAIConfigured } from "@/lib/ai/config";
import { markWhatsAppMessageRead, sendWhatsAppText } from "@/lib/whatsapp/meta";
import {
  countRecentInboundMessages,
  getConversationHistory,
  getWhatsAppAiSettings,
  hasOutboundMessages,
  requestConversationHandoff,
  setContactOptedOut,
  storeInboundEvent,
  storeOutboundMessage,
  storeToolEvents,
} from "@/lib/whatsapp/store";
import type { WhatsAppInboundEvent } from "@/lib/whatsapp/webhookPayload";

function normalizeCommand(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

const STOP_COMMANDS = new Set([
  "sair",
  "parar",
  "stop",
  "cancelar mensagens",
  "nao quero mensagens",
]);
const START_COMMANDS = new Set(["voltar", "iniciar", "start", "continuar"]);

async function sendAndStore(input: {
  event: WhatsAppInboundEvent;
  conversationId: string;
  text: string;
}): Promise<void> {
  const ids = await sendWhatsAppText({
    phoneNumberId: input.event.phoneNumberId,
    to: input.event.from,
    text: input.text,
  });
  await storeOutboundMessage({
    conversationId: input.conversationId,
    metaMessageId: ids[0],
    senderType: "ai",
    content: input.text,
  });
}

export async function handleWhatsAppInboundEvent(
  event: WhatsAppInboundEvent
): Promise<void> {
  const context = await storeInboundEvent(event);
  if (!context.inserted) {
    return;
  }

  markWhatsAppMessageRead({
    phoneNumberId: event.phoneNumberId,
    messageId: event.messageId,
  }).catch((error) => console.error("Não foi possível marcar como lida:", error));

  const settings = await getWhatsAppAiSettings();
  const command = event.text ? normalizeCommand(event.text) : "";

  if (STOP_COMMANDS.has(command)) {
    await setContactOptedOut(context.contactId, true);
    await sendAndStore({
      event,
      conversationId: context.conversationId,
      text: "Tudo bem. As respostas automáticas foram interrompidas. Envie VOLTAR quando quiser falar conosco novamente.",
    });
    return;
  }

  if (START_COMMANDS.has(command)) {
    await setContactOptedOut(context.contactId, false);
  } else if (context.optedOut) {
    return;
  }

  if (
    !settings.aiEnabled ||
    !settings.autoReplyEnabled ||
    !isOpenAIConfigured() ||
    context.conversationStatus === "human"
  ) {
    return;
  }

  if (!(await hasOutboundMessages(context.conversationId))) {
    await sendAndStore({
      event,
      conversationId: context.conversationId,
      text: settings.welcomeMessage,
    });
  }

  const recentMessageCount = await countRecentInboundMessages(
    context.conversationId
  );
  if (recentMessageCount > settings.maxMessagesPer10Minutes) {
    await requestConversationHandoff({
      conversationId: context.conversationId,
      reason: "Limite de mensagens automáticas atingido em 10 minutos.",
    });
    await sendAndStore({
      event,
      conversationId: context.conversationId,
      text: settings.handoffMessage,
    });
    return;
  }

  if (!event.text) {
    await requestConversationHandoff({
      conversationId: context.conversationId,
      reason: `Mensagem do tipo ${event.messageType} requer atendimento humano.`,
    });
    await sendAndStore({
      event,
      conversationId: context.conversationId,
      text: settings.handoffMessage,
    });
    return;
  }

  try {
    const history = await getConversationHistory(context.conversationId);
    const reply = await generateAssistantReply({
      whatsappUserId: event.from,
      history,
    });
    await storeToolEvents(context.conversationId, reply.toolEvents);
    await sendAndStore({
      event,
      conversationId: context.conversationId,
      text: reply.text,
    });

    if (reply.handoffRequested) {
      await requestConversationHandoff({
        conversationId: context.conversationId,
        reason: reply.handoffReason || "Transferência solicitada pela IA.",
      });
      if (!reply.text.includes(settings.handoffMessage)) {
        await sendAndStore({
          event,
          conversationId: context.conversationId,
          text: settings.handoffMessage,
        });
      }
    }
  } catch (error) {
    console.error("Erro no atendimento automatizado do WhatsApp:", error);
    await requestConversationHandoff({
      conversationId: context.conversationId,
      reason: "Falha técnica durante a resposta automática.",
    });
    await sendAndStore({
      event,
      conversationId: context.conversationId,
      text: settings.handoffMessage,
    });
  }
}
