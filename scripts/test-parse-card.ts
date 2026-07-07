import "dotenv/config";
import { parseCardInfo } from "../src/lib/ai/parse-card";

const sample = `我叫张明，是某品牌咨询公司项目总监，负责品牌战略咨询、品牌营销、爆品打造。电话13800138000，邮箱demo@example.com。`;

async function main() {
  const result = await parseCardInfo(sample);
  console.log("name:", result.name);
  console.log("services:", result.services);
  console.log("experiences:", result.experiences.length);
  console.log("honors:", result.honors);
  console.log("theme:", result.suggested_theme);
}

main().catch(console.error);
