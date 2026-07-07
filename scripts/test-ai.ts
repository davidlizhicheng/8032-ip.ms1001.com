import "dotenv/config";
import { callAIJson } from "../src/lib/ai/client";
import { isAIConfigured, getAIModel, getActiveProvider } from "../src/lib/ai/providers";

async function main() {
  console.log("provider:", getActiveProvider());
  console.log("model:", getAIModel());
  console.log("configured:", isAIConfigured());

  try {
    const result = await callAIJson<{ ok: string }>(
      "只返回 JSON",
      '返回 {"ok":"yes"}',
    );
    console.log("AI OK:", result);
  } catch (error) {
    console.error("AI FAIL:", error);
  }
}

main();
