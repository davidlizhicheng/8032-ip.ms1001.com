import "dotenv/config";
import { lookupPersonCandidatesFromEncyclopedia } from "../src/lib/search/lookup-person-encyclopedia.ts";

for (const name of process.argv.slice(2).length ? process.argv.slice(2) : ["马云", "任正非"]) {
  const r = await lookupPersonCandidatesFromEncyclopedia(name);
  console.log(`\n--- ${name} (${r.candidates.length} 候选) ---`);
  for (const c of r.candidates) {
    console.log(`• ${c.label}`);
    console.log(`  id: ${c.id.slice(0, 60)}`);
    console.log(`  ${(c.snippet || "").slice(0, 100)}`);
  }
}
