#!/usr/bin/env node
/** 本地 E2E：百科确认 → 名片解析 → 批量预检 */
const BASE = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3002";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 300) };
  }
  return { res, data };
}

async function main() {
  let ok = 0;
  const total = 3;

  {
    const { res, data } = await post("/api/person/lookup", { name: "马云" });
    if (!res.ok) throw new Error(`lookup failed: ${JSON.stringify(data)}`);
    if (!data.needsConfirmation || !data.candidates?.length) {
      throw new Error(`lookup 无候选: ${JSON.stringify(data).slice(0, 300)}`);
    }
    console.log(`✓ 马云百科检索: ${data.candidates.length} 候选`);
    ok++;
  }

  {
    const { res, data } = await post("/api/ai/parse-card-info", {
      rawText: "马云",
      enrichFromWeb: true,
    });
    if (!res.ok) throw new Error(`parse step1 failed: ${JSON.stringify(data)}`);
    if (data.status !== "needs_confirmation") {
      throw new Error(`应返回 needs_confirmation，实际: ${data.status}`);
    }
    console.log(`✓ 名片第一步确认: ${data.candidates.length} 候选`);
    ok++;
  }

  {
    const { res, data } = await post("/api/admin/batch/precheck", {
      names: "马云\n任正非",
      entityType: "person",
    });
    if (!res.ok) throw new Error(`batch precheck failed: ${JSON.stringify(data)}`);
    if (!data.ambiguous?.length || data.ambiguous.length < 2) {
      throw new Error(`批量预检应返回 2 位人物: ${JSON.stringify(data).slice(0, 400)}`);
    }
    console.log(`✓ 批量预检: ${data.ambiguous.length} 位需确认`);
    ok++;
  }

  console.log(`\n${ok}/${total} E2E 通过 @ ${BASE}`);
  process.exit(ok === total ? 0 : 1);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
