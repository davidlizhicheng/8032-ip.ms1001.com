import OpenAI from "openai";

export type AIProvider = "deepseek" | "minimax" | "fenno" | "openai" | "custom";

export function getActiveProvider(): AIProvider {
  const p = process.env.AI_PROVIDER?.toLowerCase();
  if (p === "deepseek" || p === "minimax" || p === "fenno" || p === "openai") {
    return p;
  }
  if (process.env.MINIMAX_API_KEY) return "minimax";
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.FENNO_API_KEY) return "fenno";
  return "custom";
}

export function getAIClient(): OpenAI | null {
  const provider = getActiveProvider();

  const configs: Record<string, { apiKey?: string; baseURL?: string; model: string }> = {
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    },
    minimax: {
      apiKey: process.env.MINIMAX_API_KEY,
      baseURL: process.env.MINIMAX_BASE_URL || "https://api.minimax.chat/v1",
      model: process.env.MINIMAX_MODEL || "abab6.5s-chat",
    },
    fenno: {
      apiKey: process.env.FENNO_API_KEY,
      baseURL: process.env.FENNO_BASE_URL || process.env.OPENAI_BASE_URL,
      model: process.env.FENNO_MODEL || "gpt-4o-mini",
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: undefined,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    },
    custom: {
      apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.AI_BASE_URL,
      model: process.env.AI_MODEL || "gpt-4o-mini",
    },
  };

  const cfg = configs[provider];
  if (!cfg?.apiKey) return null;

  return new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL || undefined,
  });
}

export function getAIModel(): string {
  const provider = getActiveProvider();
  const map: Record<string, string> = {
    deepseek: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    minimax: process.env.MINIMAX_MODEL || "abab6.5s-chat",
    fenno: process.env.FENNO_MODEL || "gpt-4o-mini",
    openai: process.env.OPENAI_MODEL || "gpt-4o-mini",
    custom: process.env.AI_MODEL || "gpt-4o-mini",
  };
  return map[provider];
}

export function supportsJsonResponseFormat(): boolean {
  const provider = getActiveProvider();
  // MiniMax 返回 400 unknown response_format type 'json_object' (2013)
  return provider !== "minimax";
}

export function isAIConfigured(): boolean {
  return getAIClient() !== null;
}
