import "server-only";

import OpenAI from "openai";

let client: OpenAI | undefined;

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("A variável OPENAI_API_KEY não foi configurada.");
  }

  if (!client) {
    client = new OpenAI({ apiKey });
  }

  return client;
}
