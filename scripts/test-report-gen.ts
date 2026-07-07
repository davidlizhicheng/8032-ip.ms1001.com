import "dotenv/config";
import { generateReportContent } from "../src/lib/ai/generate-entity";

async function main() {
  try {
    const report = await generateReportContent(
      "深圳",
      "city",
      "深圳是中国经济特区，华为腾讯比亚迪总部所在地",
    );
    console.log("steps:", report.steps?.length);
    console.log("step1 case:", report.steps?.[0]?.brand_case?.slice(0, 150));
    console.log("is mock?", report.steps?.[0]?.brand_case?.includes("差异化策略在市场中建立独特认知"));
  } catch (e) {
    console.error("FAIL", e);
  }
}

main();
