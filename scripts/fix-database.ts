/**
 * 修复生产库 schema 漂移（visibility 等字段缺失 / 迁移失败 P3009）
 * 用法：npm run fix-db   （需先 npm install）
 */
import Database from "better-sqlite3";
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";

const FAILED_VISIBILITY_MIGRATION = "20260627180000_add_visibility_featured";

function loadEnvFile(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function dbPathFromUrl(url: string): string {
  const m = url.match(/file:(.+)/);
  if (!m) throw new Error(`仅支持 SQLite file: URL，当前: ${url}`);
  const raw = m[1].replace(/^\.?\//, "");
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return cols.some((c) => c.name === column);
}

function hasIndex(db: Database.Database, name: string): boolean {
  const row = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name=?`)
    .get(name) as { name: string } | undefined;
  return Boolean(row);
}

function hasTable(db: Database.Database, table: string): boolean {
  const row = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(table) as { name: string } | undefined;
  return Boolean(row);
}

function schemaVisibilityReady(db: Database.Database): boolean {
  return (
    hasColumn(db, "entities", "visibility") &&
    hasColumn(db, "entities", "is_featured") &&
    hasColumn(db, "cards", "visibility")
  );
}

function hasFailedMigration(db: Database.Database, name: string): boolean {
  if (!hasTable(db, "_prisma_migrations")) return false;
  const row = db
    .prepare(
      `SELECT finished_at, rolled_back_at FROM _prisma_migrations
       WHERE migration_name = ? ORDER BY started_at DESC LIMIT 1`,
    )
    .get(name) as { finished_at: string | null; rolled_back_at: string | null } | undefined;
  if (!row) return false;
  return row.finished_at == null && row.rolled_back_at == null;
}

function resolveFailedMigration(name: string): void {
  console.log(`\n→ 检测到失败迁移 ${name}，schema 已齐全，标记为已应用...`);
  try {
    execSync(`npx prisma migrate resolve --applied ${name}`, {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("✓ 迁移状态已修复，可继续 npm run db:deploy");
  } catch {
    console.error(`✗ 自动修复失败，请手动执行:`);
    console.error(`  npx prisma migrate resolve --applied ${name}`);
  }
}

function main() {
  loadEnvFile();
  const url = process.env.DATABASE_URL || "file:./dev.db";
  const dbFile = dbPathFromUrl(url);

  if (!existsSync(dbFile)) {
    console.log(`数据库不存在: ${dbFile}，请先 npx prisma migrate deploy`);
    process.exit(0);
  }

  const db = new Database(dbFile);
  db.pragma("foreign_keys = ON");

  const patches: Array<{ table: string; column: string; ddl: string }> = [
    { table: "entities", column: "visibility", ddl: `ALTER TABLE "entities" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'private'` },
    { table: "entities", column: "is_featured", ddl: `ALTER TABLE "entities" ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false` },
    { table: "entities", column: "is_official", ddl: `ALTER TABLE "entities" ADD COLUMN "is_official" BOOLEAN NOT NULL DEFAULT false` },
    { table: "entities", column: "like_count", ddl: `ALTER TABLE "entities" ADD COLUMN "like_count" INTEGER NOT NULL DEFAULT 0` },
    { table: "cards", column: "visibility", ddl: `ALTER TABLE "cards" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'private'` },
    { table: "cards", column: "is_featured", ddl: `ALTER TABLE "cards" ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false` },
    { table: "generation_job_items", column: "research_log", ddl: `ALTER TABLE "generation_job_items" ADD COLUMN "research_log" TEXT` },
    { table: "generation_jobs", column: "options_json", ddl: `ALTER TABLE "generation_jobs" ADD COLUMN "options_json" TEXT` },
  ];

  let changed = 0;
  for (const p of patches) {
    if (!hasTable(db, p.table)) {
      console.log(`- 跳过 ${p.table}.${p.column}（表 ${p.table} 不存在，请先 migrate deploy）`);
      continue;
    }
    if (hasColumn(db, p.table, p.column)) {
      console.log(`✓ ${p.table}.${p.column} 已存在`);
      continue;
    }
    db.exec(p.ddl);
    console.log(`+ 已添加 ${p.table}.${p.column}`);
    changed++;
  }

  const indexes = [
    { name: "entities_type_visibility_idx", ddl: `CREATE INDEX "entities_type_visibility_idx" ON "entities"("type", "visibility")` },
    { name: "entities_is_featured_idx", ddl: `CREATE INDEX "entities_is_featured_idx" ON "entities"("is_featured")` },
    { name: "cards_visibility_idx", ddl: `CREATE INDEX "cards_visibility_idx" ON "cards"("visibility")` },
  ];

  for (const idx of indexes) {
    if (!hasTable(db, "entities") && idx.name.startsWith("entities")) continue;
    if (!hasTable(db, "cards") && idx.name.startsWith("cards")) continue;
    if (hasIndex(db, idx.name)) continue;
    db.exec(idx.ddl);
    console.log(`+ 已创建索引 ${idx.name}`);
    changed++;
  }

  if (hasTable(db, "entities") && hasColumn(db, "entities", "visibility")) {
    const r = db
      .prepare(`UPDATE "entities" SET "visibility" = 'public' WHERE "status" = 'published' AND "visibility" = 'private'`)
      .run();
    if (r.changes > 0) console.log(`+ 已将 ${r.changes} 条 published 实体设为 public`);
  }

  const needResolve =
    schemaVisibilityReady(db) && hasFailedMigration(db, FAILED_VISIBILITY_MIGRATION);

  db.close();

  if (needResolve) {
    resolveFailedMigration(FAILED_VISIBILITY_MIGRATION);
  }

  console.log(
    changed
      ? `\n修复完成，共 ${changed} 项变更。请执行: npm run db:deploy && npm run build`
      : "\n数据库结构正常，无需补列。",
  );
}

main();
