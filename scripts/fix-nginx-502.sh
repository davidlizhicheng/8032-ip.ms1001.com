#!/bin/bash
# 修复 ip.ms1001.com 公网 502（本机 8032 已 200 时，99% 是 Nginx 指错端口）
set -e

echo "=== 1. 本机 Node 探测 ==="
curl -sf -o /dev/null -w "8032 → HTTP %{http_code}\n" http://127.0.0.1:8032/ || echo "8032 无响应（先修 PM2）"
curl -sf -o /dev/null -w "3002 → HTTP %{http_code}\n" http://127.0.0.1:3002/ 2>/dev/null || echo "3002 无监听（正常）"
ss -tlnp | grep -E ':8032|:3002' || true

echo ""
echo "=== 2. 查找 Nginx 中 ip.ms1001.com 的反代端口 ==="
CONF_DIR="/www/server/panel/vhost/nginx"
grep -rn "proxy_pass\|127.0.0.1:3002\|127.0.0.1:8032" \
  "$CONF_DIR/ip.ms1001.com.conf" \
  "$CONF_DIR/extension/ip.ms1001.com/" 2>/dev/null || true

MAIN="$CONF_DIR/ip.ms1001.com.conf"
if [ ! -f "$MAIN" ]; then
  echo "ERROR: 找不到 $MAIN"
  echo "请在宝塔 → 网站 → ip.ms1001.com → 配置文件，确认路径"
  exit 1
fi

echo ""
echo "=== 3. 将 3002 全部改为 8032 ==="
cp "$MAIN" "${MAIN}.bak.$(date +%Y%m%d%H%M%S)"
sed -i 's|127\.0\.0\.1:3002|127.0.0.1:8032|g' "$MAIN"
sed -i 's|localhost:3002|127.0.0.1:8032|g' "$MAIN"

if [ -d "$CONF_DIR/extension/ip.ms1001.com" ]; then
  for f in "$CONF_DIR/extension/ip.ms1001.com"/*.conf; do
    [ -f "$f" ] || continue
    sed -i 's|127\.0\.0\.1:3002|127.0.0.1:8032|g' "$f"
    sed -i 's|localhost:3002|127.0.0.1:8032|g' "$f"
  done
fi

echo "当前 proxy_pass："
grep -n "proxy_pass" "$MAIN" || true

echo ""
echo "=== 4. 重载 Nginx ==="
nginx -t
nginx -s reload

echo ""
echo "=== 5. 验证 ==="
curl -sf -o /dev/null -w "本机 8032: HTTP %{http_code}\n" http://127.0.0.1:8032/
curl -sf -o /dev/null -w "公网 HTTPS: HTTP %{http_code}\n" -k "https://ip.ms1001.com/" || \
  curl -sf -o /dev/null -w "公网 HTTP: HTTP %{http_code}\n" "http://ip.ms1001.com/"

echo ""
echo "✓ 若公网仍 502："
echo "  1) 宝塔 → 网站 → ip.ms1001.com → 反向代理，目标 URL 改为 http://127.0.0.1:8032"
echo "  2) 不要用「PHP 站点」模式，要用纯反代"
echo "  3) tail -20 /www/wwwlogs/ip.ms1001.com.error.log"
