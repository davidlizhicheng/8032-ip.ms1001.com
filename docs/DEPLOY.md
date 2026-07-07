# 服务器部署指南

项目路径：`ip-card-ai/`（Next.js 16 + Prisma + SQLite）

**固定端口：3002**（本机 `ai-ms1001` 等常占用 3000，勿改其他端口）

---

## 上传前检查（本地）

```bash
cd ip-card-ai
npm install
npm rebuild better-sqlite3   # Linux 服务器上 npm install 会自动编译
npx tsc --noEmit
npm run build
```

确认 `.env` **不要**打进压缩包；在服务器单独创建。

---

## 需要上传什么？

**推荐：Git 拉代码。** 若手工上传整个 `ip-card-ai`，**排除**：

| 排除 | 原因 |
|------|------|
| `node_modules/` | 服务器 `npm install` |
| `.next/` | 服务器 `npm run build` |
| `.env` | 含密钥，服务器单独创建 |
| `*.db` / `prisma/dev.db` | 服务器初始化 |
| `.git/` | 可选 |

**必须包含：** `src/`、`prisma/`、`public/`、`ecosystem.config.cjs`、`scripts/deploy-server.sh`、`package.json`、`package-lock.json`、配置文件。

---

## 服务器要求

- Node.js **20+**（LTS）
- Linux x64（`better-sqlite3` 需在目标机编译）
- 可访问外网（AI / 百科 / Exa·Tavily·Firecrawl 等）
- 磁盘 ≥ 2GB

---

## 部署步骤（Linux + PM2 + 端口 3002）

### 1. 代码与依赖

```bash
cd /www/wwwroot/ip.ms1001.com   # 或你的站点目录
# git clone / 上传解压后：
npm install
mkdir -p public/uploads
chmod 755 public/uploads
```

### 2. 环境变量

```bash
cp .env.example .env
nano .env
```

**生产推荐配置：**

```env
DATABASE_URL="file:./prod.db"
NODE_ENV=production
PORT=3002

# AI（任选其一为主力）
AI_PROVIDER=minimax
MINIMAX_API_KEY=sk-xxx
MINIMAX_BASE_URL=https://api.minimax.chat/v1
MINIMAX_MODEL=abab6.5s-chat

# 或 DeepSeek
# AI_PROVIDER=deepseek
# DEEPSEEK_API_KEY=sk-xxx

# Fenno 生图（企业品牌介绍图）
FENNO_API_KEY=sk-xxx
FENNO_IMAGE_MODEL=gpt-image-2

# 检索三源（建议都配）
EXA_API_KEY=xxx
EXA_SEARCH_TYPE=auto
EXA_USER_LOCATION=CN
TAVILY_API_KEY=tvly-xxx
FIRECRAWL_API_KEY=fc-xxx
FIRECRAWL_COUNTRY=CN

# 站点（上传图片绝对 URL、OAuth 回调）
SITE_URL=https://ip.ms1001.com
NEXT_PUBLIC_SITE_URL=https://ip.ms1001.com

# 本地上传目录（与 Nginx alias 一致）
UPLOAD_DIR=/www/wwwroot/ip.ms1001.com/public/uploads

# 统一登录（若启用）
AUTH_BASE_URL=https://ai.ms1001.com
CENTRAL_BILLING_URL=https://ai.ms1001.com/billing
PLATFORM_KEY=ip.ms1001.com
USE_UNIFIED_AUTH=true
DEV_MOCK_PAYMENT=false
```

可选：`SERPER_API_KEY`、`BRAVE_SEARCH_API_KEY`、腾讯云 COS（不配则图片存 `public/uploads`）。

### 3. 数据库

```bash
npx prisma migrate deploy
npx tsx prisma/seed.ts    # 可选
```

### 4. 构建与 PM2（端口 8032）

```bash
npm run build    # 自动复制 public + .next/static 到 standalone
pm2 delete ip-card-ai 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

`output: standalone` 时 **不要用** `next start`，应运行 `.next/standalone/server.js`（`ecosystem.config.cjs` 与 `npm run start` 已配置）。

### 5. Nginx

使用 `docs/nginx-ip.ms1001.com.conf` 替换宝塔站点配置，**反代目标必须是**：

```nginx
proxy_pass http://127.0.0.1:8032;
```

WebSocket 映射见 `docs/nginx-http-upgrade-map.conf`（放在 `http {}` 内）。

```bash
nginx -t && nginx -s reload
```

---

## 一键发布（更新代码后）

```bash
cd /www/wwwroot/ip.ms1001.com
git pull    # 或重新上传
bash scripts/deploy-server.sh
```

---

## 部署后自检

```bash
# 本机进程
curl -I http://127.0.0.1:8032
curl -I http://127.0.0.1:8032/admin/batch

# 冒烟（公网域名）
SMOKE_BASE_URL=https://ip.ms1001.com npm run smoke

# 检索三源
npx tsx scripts/test-all-providers.ts "华为 品牌 新闻"

# 百科 + 生成
npx tsx scripts/test-research.ts 胖东来 company
```

浏览器：

- https://ip.ms1001.com/admin/batch — 批量生成
- https://ip.ms1001.com/admin/review — 审核发布
- https://ip.ms1001.com/company/pang-dong-lai — 企业档案（示例）

---

## 常见问题

**Q：502 / curl 127.0.0.1:8032 失败？**

```bash
pm2 logs ip-card-ai --lines 50
ss -tlnp | grep 8032
cd /www/wwwroot/ip.ms1001.com && npm run build && pm2 restart ip-card-ai
```

确认 Nginx **不是** 反代到 3000。

**Q：`next: command not found` / 缺少 `.next/prerender-manifest.json`？**

在项目目录执行 `npm install && npm run build`，再用 `pm2 start ecosystem.config.cjs`。

**Q：上传图片 404？**

检查 `public/uploads` 存在且 Nginx `alias` 路径与 `UPLOAD_DIR` 一致。

**Q：502 因 AI 批量任务超时？**

Nginx 已设 `proxy_read_timeout 300s`；批量生成请用 `/admin/batch` 异步任务，不要同步等页面。

**Q：百科正文过短？**

国内 VPS + 配置 `EXA_API_KEY` / `FIRECRAWL_API_KEY`；海外机器易被限速。

**Q：SQLite 备份？**

定期复制 `prod.db`。

---

## 端口说明

| 用途 | 端口 |
|------|------|
| ip-card-ai（本项目） | **8032** |
| Nginx 反代 | → 127.0.0.1:8032 |
| 本地开发 `npm run dev` | **8032** |

不要使用 3000（常与同机其他 Node 服务冲突）。
