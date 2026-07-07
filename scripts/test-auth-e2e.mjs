/**
 * 端到端验证：统一认证 ↔ ip-card-ai 账号打通 + 管理员权限
 * 用法：node scripts/test-auth-e2e.mjs
 * 环境：AUTH_BASE=http://127.0.0.1:10080  IP_BASE=http://127.0.0.1:3005
 */
const AUTH_BASE = (process.env.AUTH_BASE || "http://127.0.0.1:9080").replace(/\/$/, "");
const IP_BASE = (process.env.IP_BASE || "http://127.0.0.1:3005").replace(/\/$/, "");
const TEST_PHONE = process.env.TEST_PHONE || "18665898305";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "test123456";

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 300) };
  }
  return { ok: res.ok, status: res.status, data };
}

async function login(username, password) {
  const { ok, status, data } = await jsonFetch(`${AUTH_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, redirectUri: `${IP_BASE}/` }),
  });
  if (!ok || !data.token) {
    throw new Error(`登录失败 ${username} (${status}): ${data.error || JSON.stringify(data)}`);
  }
  return data.token;
}

async function verifyAuth(token) {
  const { ok, status, data } = await jsonFetch(`${AUTH_BASE}/api/auth/verify`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!ok || !data.valid) {
    throw new Error(`verify 失败 (${status}): ${JSON.stringify(data)}`);
  }
  return data.user;
}

async function ipMe(token) {
  const { ok, status, data } = await jsonFetch(`${IP_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!ok) throw new Error(`/api/auth/me 失败 (${status}): ${JSON.stringify(data)}`);
  return data;
}

async function ipAdminContent(token) {
  const { ok, status, data } = await jsonFetch(`${IP_BASE}/api/admin/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { ok, status, data };
}

function pass(label) {
  console.log(`  ✓ ${label}`);
}

function fail(label, err) {
  console.log(`  ✗ ${label}: ${err instanceof Error ? err.message : err}`);
}

async function health(name, url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    pass(`${name} 可达 (${res.status}) ${url}`);
    return true;
  } catch (e) {
    fail(`${name} 不可达`, e);
    return false;
  }
}

async function runUserCase(label, username, password, expectAdmin) {
  console.log(`\n── ${label} (${username}) ──`);
  try {
    const token = await login(username, password);
    pass("总站登录成功，获得 token");

    const user = await verifyAuth(token);
    pass(`总站 verify: role=${user.role}, tier=${user.tier || "-"}`);

    const me = await ipMe(token);
    if (!me.user?.username) throw new Error("ip 站未识别用户");
    pass(`ip /api/auth/me: username=${me.user.username}, role=${me.user.role}`);
    pass(`品牌升级: ${me.brandUpgrade ? "已开通" : "未开通"}`);

    const admin = await ipAdminContent(token);
    if (expectAdmin) {
      if (!admin.ok) throw new Error(`管理员接口拒绝 (${admin.status}): ${admin.data?.error}`);
      pass(`ip /api/admin/content: 200 OK (entities=${admin.data.entities?.length ?? 0}, cards=${admin.data.cards?.length ?? 0})`);
    } else if (admin.status === 403) {
      pass("ip /api/admin/content: 403 符合预期（非管理员）");
    } else {
      pass(`ip /api/admin/content: status=${admin.status}`);
    }
    return true;
  } catch (e) {
    fail("用例失败", e);
    return false;
  }
}

async function main() {
  console.log("=== 账号打通 E2E 测试 ===");
  console.log(`AUTH: ${AUTH_BASE}`);
  console.log(`IP:   ${IP_BASE}`);

  const authOk = await health("统一认证", `${AUTH_BASE}/api/auth/verify`);
  const ipOk = await health("ip-card-ai", `${IP_BASE}/api/auth/config`);
  if (!authOk || !ipOk) {
    console.log("\n请先启动服务：");
    console.log("  unified-auth: PORT=10080 node server.js");
    console.log("  ip-card-ai:   AUTH_BASE_URL=http://127.0.0.1:10080 PORT=3005 npm run dev");
    process.exit(1);
  }

  let ok = 0;
  let total = 0;

  total++;
  if (await runUserCase("内置管理员", "admin", "admin123456", true)) ok++;

  total++;
  if (await runUserCase("目标手机号管理员", TEST_PHONE, TEST_PASSWORD, true)) ok++;

  console.log(`\n=== 结果: ${ok}/${total} 通过 ===`);
  process.exit(ok === total ? 0 : 1);
}

main();
