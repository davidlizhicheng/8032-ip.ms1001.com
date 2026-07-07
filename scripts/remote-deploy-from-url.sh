#!/bin/bash
# 在服务器 /www/wwwroot/ip.ms1001.com 执行：从部署包 URL 拉取并发布
set -euo pipefail

DEPLOY_URL="${1:-}"
APP_DIR="${APP_DIR:-/www/wwwroot/ip.ms1001.com}"

if [ -z "$DEPLOY_URL" ]; then
  echo "用法: bash scripts/remote-deploy-from-url.sh <deploy.tgz URL>"
  exit 1
fi

TMP="/tmp/ip-card-ai-deploy-$$.tgz"
echo "==> 下载 $DEPLOY_URL"
curl -fsSL "$DEPLOY_URL" -o "$TMP"

echo "==> 解压到 $APP_DIR"
mkdir -p "$APP_DIR"
tar -xzf "$TMP" -C "$APP_DIR"
rm -f "$TMP"

cd "$APP_DIR"
chmod +x scripts/deploy-server.sh
bash scripts/deploy-server.sh

echo "==> 远程冒烟（本机）"
curl -sf -X POST http://127.0.0.1:3002/api/person/lookup \
  -H "Content-Type: application/json" \
  -d '{"name":"马云"}' | head -c 400
echo ""
