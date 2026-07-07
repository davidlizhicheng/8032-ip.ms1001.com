#!/usr/bin/env node
/** 本地前端 + API 冒烟（默认 http://127.0.0.1:3002） */
const BASE = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:3002").replace(/\/$/, "");

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
  console.log(`=== Frontend smoke @ ${BASE} ===\n`);
  let ok = 0;
  const total = 13;

  const pages = [
    ["/", "首页"],
    ["/admin/batch", "批量生成"],
    ["/admin/review", "审核页"],
    ["/library/company", "企业库"],
    ["/library/person", "人物库"],
    ["/create", "创建名片"],
  ];

  for (const [path, label] of pages) {
    if (await check(`${label} ${path}`, async () => {
      const res = await fetch(`${BASE}${path}`, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      if (html.length < 500) throw new Error("页面内容过短");
    })) ok++;
  }

  if (await check("企业档案页 /company/pang-dong-lai", async () => {
    const res = await fetch(`${BASE}/company/pang-dong-lai`);
    if (res.status === 404) throw new Error("404 — 数据库无该实体，可忽略或重新生成");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  })) ok++;

  if (await check("18步报告 /report/company/pang-dong-lai", async () => {
    const res = await fetch(`${BASE}/report/company/pang-dong-lai`);
    if (res.status === 404) throw new Error("404 — 无报告");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    if (!/降龙十八掌|第\s*1\s*步|消费者研究/.test(html)) {
      throw new Error("报告页缺少18步内容");
    }
  })) ok++;

  if (await check("AI 状态 /api/ai/status", async () => {
    const res = await fetch(`${BASE}/api/ai/status`);
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    if (!data.configured) throw new Error("AI 未配置");
  })) ok++;

  if (await check("百科检索 /api/person/lookup", async () => {
    const res = await fetch(`${BASE}/api/person/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "马云" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data).slice(0, 200));
    if (!data.candidates?.length) throw new Error("无百科候选");
  })) ok++;

  if (await check("批量预检 /api/admin/batch/precheck", async () => {
    const res = await fetch(`${BASE}/api/admin/batch/precheck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names: "华为", entityType: "company" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    if (!data.ready?.includes("华为")) throw new Error(JSON.stringify(data));
  })) ok++;

  if (await check("图片上传 /api/upload", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    const form = new FormData();
    form.append("file", new Blob([png], { type: "image/png" }), "smoke.png");
    form.append("uploadIndex", "0");
    const res = await fetch(`${BASE}/api/upload`, { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    if (!data.url?.includes("/api/uploads/")) throw new Error(`无效 URL: ${data.url}`);
    const img = await fetch(`${BASE}${data.url.startsWith("http") ? new URL(data.url).pathname : data.url}`);
    if (!img.ok) throw new Error(`图片不可访问 HTTP ${img.status}`);
  })) ok++;

  if (await check("点赞 API /api/entities/pang-dong-lai/like", async () => {
    const res = await fetch(`${BASE}/api/entities/pang-dong-lai/like?v=1`);
    if (res.status === 404) return; // 实体不存在则跳过
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    if (typeof data.likeCount !== "number") throw new Error("缺少 likeCount");
  })) ok++;

  console.log(`\n${ok}/${total} 通过`);
  process.exit(ok >= total - 2 ? 0 : 1); // 允许实体404时少2项
}

main();
