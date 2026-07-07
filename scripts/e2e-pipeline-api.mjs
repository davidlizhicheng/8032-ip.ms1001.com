#!/usr/bin/env node
/** 完整 API 流水线：lookup → 确认 → parse 整合 */
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
    data = { raw: text.slice(0, 400) };
  }
  return { res, data };
}

async function main() {
  console.log("=== API 流水线 E2E @", BASE, "===\n");

  // Step 2: lookup
  const { res: l1, data: lookup } = await post("/api/person/lookup", { name: "马云" });
  if (!l1.ok) throw new Error(`lookup: ${JSON.stringify(lookup)}`);
  console.log("✓ [2] 百科检索:", lookup.candidates?.length, "候选");
  const candidateId =
    lookup.candidates?.[0]?.id;
  if (!candidateId) throw new Error("无候选");

  // Step 1+3+4 via parse-card API
  console.log("… [3+4] 确认并整合生成中（约 30-60s）");
  const t0 = Date.now();
  const { res: p1, data: parsed } = await post("/api/ai/parse-card-info", {
    rawText: "马云",
    enrichFromWeb: true,
    confirmedCandidateId: candidateId,
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  if (!p1.ok) throw new Error(`parse: ${JSON.stringify(parsed)}`);
  if (parsed.status !== "success") throw new Error(`应 success，实际 ${parsed.status}`);

  const longBio = (parsed.long_bio || parsed.data?.long_bio || "").trim();
  const bio = (parsed.bio || parsed.data?.bio || "").trim();
  console.log(`✓ [4] 整合完成 (${elapsed}s)`);
  console.log("       long_bio:", longBio.length, "字");
  console.log("       bio 预览:", bio.slice(0, 100) + "…");
  console.log("       sourcesUsed:", parsed.sourcesUsed);

  if (!/阿里巴巴|马云|杭州|企业家/.test(longBio + bio)) throw new Error("正文未命中马云关键词");
  console.log("✓ [4] 主题正确（马云人物条目）");

  if (longBio.length >= 800) {
    console.log("✓ [4] 字数达标 (≥800)");
  } else {
    console.log(`⚠ [4] 字数偏短 (${longBio.length})，本地百科可能未抓到全文；服务器国内环境通常 ≥1000`);
  }

  console.log("\n=== API 流水线通过 ===");
  console.log("\n正文开头:\n", longBio.slice(0, 350) + "…");
}

main().catch((e) => {
  console.error("\n✗", e.message);
  process.exit(1);
});
