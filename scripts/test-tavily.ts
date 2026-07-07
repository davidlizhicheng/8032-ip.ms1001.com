import "dotenv/config";
import { getActiveSearchProviders, searchWeb } from "../src/lib/search/web-search";

async function main() {
  console.log("providers:", getActiveSearchProviders());
  const r = await searchWeb("成都 城市品牌", { rawQuery: "成都 城市品牌", limit: 3 });
  console.log("results:", r.length);
  for (const x of r) {
    console.log(`  [${x.provider}] ${x.title.slice(0, 50)}`);
  }
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
