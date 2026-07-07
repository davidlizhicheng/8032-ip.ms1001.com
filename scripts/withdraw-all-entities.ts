/**
 * 撤回全部旧实体档案（设为 admin_hidden），便于管理员重新批量生成。
 * 用法: npx tsx scripts/withdraw-all-entities.ts
 */
import { withdrawAllEntities } from "../src/lib/services/content-visibility";

async function main() {
  const count = await withdrawAllEntities();
  console.log(`已撤回 ${count} 条实体档案。请前往 /admin/batch 重新批量生成，并在 /admin/content 设置官方推荐。`);
}

main().catch(console.error);
