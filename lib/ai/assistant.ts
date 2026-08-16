import "server-only";

import { createHash } from "node:crypto";

import type {
  ResponseInputItem,
} from "openai/resources/responses/responses";

import { getOpenAIClient, getOpenAIModel } from "@/lib/ai/config";
import { getActiveKnowledgeText } from "@/lib/ai/knowledge";
import { buildWhatsAppAssistantPrompt } from "@/lib/ai/prompt";
import {
  executePropertyTool,
  propertyTools,
  type AiToolEvent,
} from "@/lib/ai/propertyTools";

export interface AssistantHistoryMessage {
  senderType: "customer" | "ai" | "human" | "system";
  content: string;
}

export interface AssistantReply {
  text: string;
  handoffRequested: boolean;
  handoffReason?: string;
  toolEvents: AiToolEvent[];
}

function safetyIdentifier(whatsappUserId: string): string {
  return createHash("sha256")
    .update(`aluga-casa-buzios:${whatsappUserId}`)
    .digest("hex");
}

function parseArguments(raw: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export async function generateAssistantReply(input: {
  whatsappUserId: string;
  history: AssistantHistoryMessage[];
}): Promise<AssistantReply> {
  const [knowledge, openai] = await Promise.all([
    getActiveKnowledgeText(),
    Promise.resolve(getOpenAIClient()),
  ]);

  const historyItems: ResponseInputItem[] = input.history
    .filter((message) => message.content.trim())
    .slice(-14)
    .map((message) => ({
      type: "message" as const,
      role: message.senderType === "customer" ? "user" as const : "assistant" as const,
      content: message.content,
    }));

  const responseInput: ResponseInputItem[] = [...historyItems];
  const toolEvents: AiToolEvent[] = [];
  let handoffRequested = false;
  let handoffReason: string | undefined;

  for (let turn = 0; turn < 4; turn += 1) {
    const response = await openai.responses.create({
      model: getOpenAIModel(),
      instructions: buildWhatsAppAssistantPrompt({ knowledge }),
      input: responseInput,
      tools: propertyTools,
      tool_choice: "auto",
      parallel_tool_calls: false,
      include: ["reasoning.encrypted_content"],
      store: false,
      max_output_tokens: 900,
      safety_identifier: safetyIdentifier(input.whatsappUserId),
    });

    const functionCalls = response.output.filter(
      (item) => item.type === "function_call"
    );

    if (functionCalls.length === 0) {
      const text = response.output_text.trim();
      return {
        text:
          text ||
          "Não consegui concluir essa consulta com segurança. Vou encaminhar para nossa equipe.",
        handoffRequested: handoffRequested || !text,
        handoffReason:
          handoffReason ||
          (!text ? "A IA não produziu uma resposta final." : undefined),
        toolEvents,
      };
    }

    responseInput.push(
      ...(response.output as unknown as ResponseInputItem[])
    );

    for (const call of functionCalls) {
      const args = parseArguments(call.arguments);

      try {
        const execution = await executePropertyTool(call.name, args);
        toolEvents.push({
          toolName: call.name,
          arguments: args,
          result: execution.output,
          success: true,
        });

        if (execution.handoffRequested) {
          handoffRequested = true;
          handoffReason = execution.handoffReason;
        }

        responseInput.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify(execution.output),
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Falha na ferramenta";
        toolEvents.push({
          toolName: call.name,
          arguments: args,
          result: { error: errorMessage },
          success: false,
        });
        responseInput.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify({ success: false, error: errorMessage }),
        });
      }
    }
  }

  return {
    text: "Essa consulta precisa de uma verificação da nossa equipe. Vou encaminhar seu atendimento.",
    handoffRequested: true,
    handoffReason: handoffReason || "Limite de etapas automáticas atingido.",
    toolEvents,
  };
}
