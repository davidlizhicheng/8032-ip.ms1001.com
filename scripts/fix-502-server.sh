#!/bin/bash
# 修复 ip.ms1001.com 502 — 在 /www/wwwroot/ip.ms1001.com 执行
set -e
APP="/www/wwwroot/ip.ms1001.com"
cd "$APP"

echo "=== 当前监听 ==="
ss -tlnp | grep -E ':8032|:3002' || echo "(无)"

echo "=== 构建并启动 8032 ==="
npm run build
pm2 delete ip-card-ai 2>/dev/null || true
if [ -f "$APP/start-prod.cjs" ]; then
  pm2 start "$APP/ecosystem.config.cjs"
else
  echo "WARN: 无 start-prod.cjs，直接启 standalone"
  PORT=8032 HOSTNAME=0.0.0.0 pm2 start "$APP/.next/standalone/server.js" --name ip-card-ai
fi
pm2 save
sleep 3

echo "=== 本机探测 ==="
curl -sf -I http://127.0.0.1:8032/ | head -3 || { pm2 logs ip-card-ai --lines 20; exit 1; }

echo ""
echo "若公网仍 502：宝塔 → ip.ms1001.com → 反向代理 必须是"
echo "  proxy_pass http://127.0.0.1:8032;"
echo "不能是 3002。改完 nginx -t && nginx -s reload"
