import "dotenv/config";
import { callAIJson } from "../src/lib/ai/client";
import {
  BRAND_REPORT_SYSTEM_PROMPT,
  BRAND_REPORT_JSON_SCHEMA,
} from "../src/lib/ai/brand-report-template";

async function main() {
  try {
    const raw = await callAIJson<unknown>(
      `${BRAND_REPORT_SYSTEM_PROMPT}\n\n返回 JSON 格式：\n${BRAND_REPORT_JSON_SCHEMA}`,
      `请为「深圳」（类型：city）撰写完整的「品牌复盘18步 · 决胜终端」报告。

已有资料摘要：
深圳是中国经济特区，华为腾讯比亚迪总部所在地

要求：
1. steps 数组必须包含全部18步，每步含 theory_tools、method_models、brand_practice、brand_case、summary_lessons 五段
2. 每段内容详实，参照胖东来/瑞幸复盘文档风格
3. 基于公开资料，不编造数据`,
    );
    console.log("OK keys:", Object.keys(raw as object));
    console.log("steps:", (raw as { steps?: unknown[] }).steps?.length);
    console.log("sample:", JSON.stringify(raw).slice(0, 800));
  } catch (e) {
    console.error("ERROR:", e instanceof Error ? e.message : e);
    if (e instanceof Error && e.stack) console.error(e.stack.slice(0, 500));
  }
}

main();
