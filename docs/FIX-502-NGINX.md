# 宝塔一键修复 ip.ms1001.com 502

**症状**：服务器上 `curl -I http://127.0.0.1:8032/` 返回 200，但浏览器打开 https://ip.ms1001.com 显示 502。

**原因**：宝塔 Nginx 仍反代到 **3002**（旧端口），而应用已在 **8032**。

## 一键修复（SSH）

```bash
cd /www/wwwroot/ip.ms1001.com
bash scripts/fix-nginx-502.sh
```

## 手动（宝塔面板）

1. **网站** → **ip.ms1001.com** → **配置文件**
2. 搜索 `proxy_pass`，全部改为：
   ```nginx
   proxy_pass http://127.0.0.1:8032;
   ```
3. **不能** 出现 `3002`
4. 保存 → **重载配置**

或：**反向代理** 标签页 → 目标 URL 改为 `http://127.0.0.1:8032`

## 验证

```bash
curl -I http://127.0.0.1:8032/
curl -I https://ip.ms1001.com/
grep proxy_pass /www/server/panel/vhost/nginx/ip.ms1001.com.conf
```

## 完整 Nginx 参考

见同目录 `docs/nginx-ip.ms1001.com.conf`（已统一 8032）。
