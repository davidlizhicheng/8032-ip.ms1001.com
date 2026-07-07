/** PM2 启动前加载 .env（standalone 不会自动读项目根 .env） */
const fs = require("node:fs");
const path = require("node:path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
  return true;
}

const root = path.join(__dirname, "..");
const loaded =
  loadEnvFile(path.join(root, ".env.production")) ||
  loadEnvFile(path.join(root, ".env"));

if (loaded) {
  console.log("[ip-card-ai] loaded .env");
} else {
  console.warn("[ip-card-ai] WARN: no .env / .env.production in", root);
}

module.exports = { loadEnvFile };
