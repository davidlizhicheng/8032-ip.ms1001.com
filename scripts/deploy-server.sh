#!/bin/bash
# 服务器发布脚本 — 在 /www/wwwroot/ip.ms1001.com 执行
set -e
cd "$(dirname "$0")/.."
APP_DIR="$(pwd)"

echo "==> 工作目录: $APP_DIR"

echo "==> 1/6 npm install（必须在服务器本地安装，勿上传 node_modules）"
mkdir -p public/uploads
npm install

if [ ! -f "$APP_DIR/node_modules/next/dist/bin/next" ]; then
  echo "ERROR: node_modules/next 不存在，npm install 失败，请检查上方报错"
  exit 1
fi

echo "==> 2/6 修复数据库 schema"
npm run fix-db || true

echo "==> 3/6 prisma migrate deploy"
if ! npm run db:deploy; then
  echo "迁移失败，尝试修复..."
  npx prisma migrate resolve --rolled-back 20260627180000_add_visibility_featured 2>/dev/null || true
  npm run fix-db || true
  npx prisma migrate resolve --applied 20260627180000_add_visibility_featured 2>/dev/null || true
fi

echo "==> 4/6 npm run build（含 standalone 静态资源复制）"
npm run build

if [ ! -f "$APP_DIR/.next/standalone/server.js" ]; then
  echo "ERROR: build 未成功，缺少 .next/standalone/server.js"
  exit 1
fi

echo "==> 5/6 pm2 重启（使用 ecosystem.config.cjs）"
# .env 若仍是 PORT=3002，会导致监听错误端口
if [ -f "$APP_DIR/.env" ]; then
  grep -q '^PORT=' "$APP_DIR/.env" && sed -i 's|^PORT=.*|PORT=8032|' "$APP_DIR/.env" || echo 'PORT=8032' >> "$APP_DIR/.env"
  grep -q '^HOSTNAME=' "$APP_DIR/.env" && sed -i 's|^HOSTNAME=.*|HOSTNAME=0.0.0.0|' "$APP_DIR/.env" || echo 'HOSTNAME=0.0.0.0' >> "$APP_DIR/.env"
fi
pm2 delete ip-card-ai 2>/dev/null || true
pm2 start "$APP_DIR/ecosystem.config.cjs"
pm2 save

echo "==> 6/6 健康检查"
sleep 3
curl -sf -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:8032/ || {
  echo "WARN: 127.0.0.1:8032 未响应，执行: pm2 logs ip-card-ai --lines 30"
}
curl -sf -o /dev/null -w "batch HTTP %{http_code}\n" http://127.0.0.1:8032/admin/batch || true
curl -sf -o /dev/null -w "static CSS %{http_code}\n" "http://127.0.0.1:8032/_next/static/css/" || true

echo ""
echo "✓ 部署完成"
echo "  pm2 logs ip-card-ai --lines 30"
echo "  https://ip.ms1001.com"
