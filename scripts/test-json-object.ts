import "dotenv/config";
import { getAIClient, getAIModel, getActiveProvider } from "../src/lib/ai/providers";

async function main() {
  const client = getAIClient()!;
  console.log("provider:", getActiveProvider());
  try {
    await client.chat.completions.create({
      model: getAIModel(),
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: 'return {"a":1}' }],
    });
    console.log("json_object: supported");
  } catch (e) {
    console.log("json_object error:", e instanceof Error ? e.message : e);
  }
}

main();
