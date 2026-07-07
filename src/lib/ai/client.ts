import { jsonrepair } from "jsonrepair";
import { getAIClient, getAIModel, getActiveProvider, supportsJsonResponseFormat } from "@/lib/ai/providers";

export { getAIClient, getAIModel, isAIConfigured, getActiveProvider, supportsJsonResponseFormat } from "@/lib/ai/providers";

function extractJsonObject(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1);

  return trimmed;
}

export async function callAIJson<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number },
): Promise<T> {
  const client = getAIClient();
  if (!client) {
    throw new Error("NO_AI_CLIENT");
  }

  const provider = getActiveProvider();
  const model = getAIModel();
  const jsonHint =
    provider === "minimax"
      ? "\n\n重要：只输出一个合法 JSON 对象，不要 markdown 代码块，不要任何解释文字。严禁截断任何字符串字段，必须写到完整句落再结束。"
      : "";

  const response = await client.chat.completions.create({
    model,
    temperature: 0.35,
    max_tokens: options?.maxTokens ?? 8192,
    ...(supportsJsonResponseFormat()
      ? { response_format: { type: "json_object" as const } }
      : {}),
    messages: [
      { role: "system", content: `${systemPrompt}${jsonHint}` },
      { role: "user", content: userPrompt },
    ],
  });

  const choice = response.choices[0];
  const content = choice?.message?.content;
  if (!content) throw new Error("AI 未返回有效内容");

  if (choice?.finish_reason === "length") {
    console.warn("[callAIJson] AI 输出被截断（finish_reason=length）");
  }

  const jsonText = extractJsonObject(content);
  try {
    return JSON.parse(jsonText) as T;
  } catch {
    return JSON.parse(jsonrepair(jsonText)) as T;
  }
}

export async function callAIText(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const client = getAIClient();
  if (!client) throw new Error("NO_AI_CLIENT");

  const response = await client.chat.completions.create({
    model: getAIModel(),
    temperature: 0.5,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return response.choices[0]?.message?.content || "";
}
