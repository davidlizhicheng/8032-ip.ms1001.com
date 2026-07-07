#!/usr/bin/env node
/** 部署后冒烟测试：验证百科检索 API 与核心页面 */
const BASE = process.env.SMOKE_BASE_URL || "https://ip.ms1001.com";

async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    return true;
  } catch (e) {
    console.error(`✗ ${name}: ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

async function main() {
  let ok = 0;
  const total = 4;

  if (
    await check("首页 200", async () => {
      const res = await fetch(BASE, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    })
  )
    ok++;

  if (
    await check("AI 状态", async () => {
      const res = await fetch(`${BASE}/api/ai/status`);
      const data = await res.json();
      if (!res.ok || !data.configured) throw new Error(JSON.stringify(data));
    })
  )
    ok++;

  if (
    await check("百科检索 /api/person/lookup", async () => {
      const res = await fetch(`${BASE}/api/person/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "马云" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
      if (!data.needsConfirmation) throw new Error("缺少 needsConfirmation");
      if (!Array.isArray(data.candidates) || data.candidates.length < 1) {
        throw new Error("未返回百科候选");
      }
      console.log(`  → 候选 ${data.candidates.length} 条，来源: ${(data.sourcesSearched || []).join("、")}`);
    })
  )
    ok++;

  if (
    await check("创建页 200", async () => {
      const res = await fetch(`${BASE}/create`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    })
  )
    ok++;

  console.log(`\n${ok}/${total} 通过`);
  process.exit(ok === total ? 0 : 1);
}

main();
