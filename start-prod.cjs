require("./scripts/load-env.cjs");

const fs = require("node:fs");
const path = require("node:path");

// 生产固定 8032 + 0.0.0.0（.env 里 PORT=3002 或仅 [::1] 会导致 Nginx 502）
process.env.PORT = "8032";
process.env.HOSTNAME = "0.0.0.0";

const server = path.join(__dirname, ".next/standalone/server.js");
if (!fs.existsSync(server)) {
  console.error("[ip-card-ai] missing", server, "— run: npm run build");
  process.exit(1);
}

// standalone server 可能是 ESM，用 dynamic import
import(server).catch((err) => {
  console.error("[ip-card-ai] failed to start:", err);
  process.exit(1);
});
