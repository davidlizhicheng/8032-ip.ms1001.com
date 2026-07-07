import "dotenv/config";
import { getActiveSearchProviders, searchWeb } from "../src/lib/search/web-search";
import { fetchExaEvidence } from "../src/lib/search/exa-search";

async function main() {
  console.log("providers:", getActiveSearchProviders());
  const r = await searchWeb("陈行甲 公益 新闻", { rawQuery: "陈行甲 公益 新闻", limit: 3 });
  console.log("searchWeb:", r.length, r.map((x) => `[${x.provider}] ${x.title.slice(0, 40)}`));

  const ev = await fetchExaEvidence("陈行甲 巴东 书记", {
    limit: 3,
    category: "news",
    userLocation: "CN",
  });
  console.log("exa evidence:", ev.length);
  for (const e of ev) {
    console.log(`  ${e.title.slice(0, 50)} (${e.text.length} chars)`);
  }
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
