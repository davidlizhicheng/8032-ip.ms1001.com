import "dotenv/config";
import { parseCardInfo } from "../src/lib/ai/parse-card";

const sample = `我叫何雪可，是深圳市超级品牌顾问有限公司董事长助理，负责品牌战略咨询、品牌营销、爆品打造。电话18820289859，邮箱coco@chaojipinpai.com。`;

async function main() {
  const result = await parseCardInfo(sample);
  console.log("name:", result.name);
  console.log("services:", result.services);
  console.log("experiences:", result.experiences.length);
  console.log("honors:", result.honors);
  console.log("theme:", result.suggested_theme);
}

main().catch(console.error);
