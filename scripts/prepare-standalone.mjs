#!/usr/bin/env node
/**
 * Copy public/ and .next/static into .next/standalone for production.
 * Required when next.config has output: "standalone".
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const standaloneDir = path.join(root, ".next", "standalone");
const serverJs = path.join(standaloneDir, "server.js");

if (!existsSync(serverJs)) {
  console.error("ERROR: .next/standalone/server.js not found — run npm run build first");
  process.exit(1);
}

const publicSrc = path.join(root, "public");
const publicDest = path.join(standaloneDir, "public");
if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
  console.log("✓ copied public/ → .next/standalone/public/");
}

const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(standaloneDir, ".next", "static");
if (existsSync(staticSrc)) {
  mkdirSync(path.dirname(staticDest), { recursive: true });
  cpSync(staticSrc, staticDest, { recursive: true });
  console.log("✓ copied .next/static/ → .next/standalone/.next/static/");
} else {
  console.error("ERROR: .next/static not found — build may have failed");
  process.exit(1);
}

for (const envName of [".env.production", ".env"]) {
  const src = path.join(root, envName);
  const dest = path.join(standaloneDir, envName);
  if (existsSync(src)) {
    cpSync(src, dest);
    console.log(`✓ copied ${envName} → .next/standalone/${envName}`);
    break;
  }
}

console.log("✓ standalone assets ready — start with: node start-prod.cjs");
