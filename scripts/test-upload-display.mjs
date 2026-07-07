#!/usr/bin/env node
/** 上传图片链路：POST /api/upload → GET /api/uploads/{file} */
import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const BASE = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3002";

function resolveAssetPath(url) {
  let s = url.trim();
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      if (u.pathname.startsWith("/uploads/") || u.pathname.startsWith("/api/uploads/")) {
        s = u.pathname.startsWith("/uploads/")
          ? u.pathname.replace(/^\/uploads\//, "/api/uploads/")
          : u.pathname;
      } else {
        return s;
      }
    } catch {
      return s;
    }
  } else if (s.startsWith("/uploads/")) {
    s = s.replace(/^\/uploads\//, "/api/uploads/");
  }
  return s;
}

async function main() {
  const cases = [
    ["/uploads/a.png", "/api/uploads/a.png"],
    ["https://ip.ms1001.com/uploads/a.png", "/api/uploads/a.png"],
    ["https://ip.ms1001.com/api/uploads/a.png", "/api/uploads/a.png"],
    ["https://baike.baidu.com/x.jpg", "https://baike.baidu.com/x.jpg"],
  ];
  for (const [input, expected] of cases) {
    const got = resolveAssetPath(input);
    if (got !== expected) throw new Error(`resolve(${input}) = ${got}, want ${expected}`);
  }
  console.log("✓ URL 规范化");

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const tmp = join(tmpdir(), `upload-test-${Date.now()}.png`);
  writeFileSync(tmp, png);

  const form = new FormData();
  form.append("file", new Blob([png], { type: "image/png" }), "test.png");
  form.append("uploadIndex", "0");

  const up = await fetch(`${BASE}/api/upload`, { method: "POST", body: form });
  const body = await up.json();
  if (!up.ok) throw new Error(`upload failed: ${JSON.stringify(body)}`);

  const url = body.url;
  if (!url.startsWith("/api/uploads/")) throw new Error(`unexpected upload url: ${url}`);
  console.log(`✓ 上传返回 ${url}`);

  const img = await fetch(`${BASE}${url}`);
  if (!img.ok) throw new Error(`GET ${url} → ${img.status}`);

  const legacyPath = url.replace("/api/uploads/", "/uploads/");
  const legacy = await fetch(`${BASE}${legacyPath}`);
  if (!legacy.ok) throw new Error(`GET ${legacyPath} → ${legacy.status}`);

  console.log("✓ 图片可访问（/api/uploads 与 /uploads 重写）");
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
