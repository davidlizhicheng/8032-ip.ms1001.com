/** 为 E2E 测试设置已知密码（仅本地 unified-auth/data/users.json） */
import { createUserService } from "../../../unified-auth/user_service.js";
import path from "path";
import { fileURLToPath } from "url";

const phone = process.argv[2] || "18665898305";
const password = process.argv[3] || "test123456";
const dataDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../unified-auth/data",
);

const users = createUserService(dataDir);
await users.updateUser(phone, { password }, "ADMIN");
console.log(`已设置 ${phone} 密码为 ${password}（本地测试用）`);
