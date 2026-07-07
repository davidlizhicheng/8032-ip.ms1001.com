#!/bin/bash
# 在服务器 /www/wwwroot/ip.ms1001.com 执行：bash scripts/server-pipeline-check.sh
set -e
cd "$(dirname "$0")/.."

echo "=== 1. 百科抓取 ==="
npx tsx scripts/test-research.ts 马云 person | tail -20
echo ""
npx tsx scripts/test-research.ts 马云 person | tail -15

echo ""
echo "=== 2. 五步流水线 ==="
npm run test:pipeline -- 马云
echo ""
npm run test:pipeline -- 马云

echo ""
echo "=== 3. API lookup ==="
curl -s -X POST http://127.0.0.1:3002/api/person/lookup \
  -H "Content-Type: application/json" \
  -d '{"name":"马云"}' | head -c 800
echo ""
curl -s -X POST http://127.0.0.1:3002/api/person/lookup \
  -H "Content-Type: application/json" \
  -d '{"name":"马云"}' | head -c 800
echo ""
