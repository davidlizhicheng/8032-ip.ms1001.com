import { prisma } from "@/lib/prisma";
import type { PersonCandidate } from "@/lib/search/disambiguate-person";

const CACHE_TTL_DAYS = Number(process.env.PERSON_KNOWLEDGE_CACHE_DAYS || 30);
let tableReady: Promise<void> | null = null;

async function ensureCacheTable() {
  if (!tableReady) {
    tableReady = prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS person_knowledge_cache (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        candidate_id TEXT NOT NULL,
        source TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        url TEXT,
        raw_json TEXT,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, candidate_id)
      )
    `).then(() => undefined);
  }
  await tableReady;
}

function cutoffDate() {
  const date = new Date();
  date.setDate(date.getDate() - CACHE_TTL_DAYS);
  return date.toISOString();
}

type CacheRow = {
  candidate_id: string;
  source: string;
  title: string;
  summary: string | null;
  url: string | null;
  raw_json: string | null;
};

export async function readPersonKnowledgeCache(name: string): Promise<PersonCandidate[]> {
  try {
    await ensureCacheTable();
    const rows = await prisma.$queryRawUnsafe<CacheRow[]>(
      `
        SELECT candidate_id, source, title, summary, url, raw_json
        FROM person_knowledge_cache
        WHERE name = ? AND updated_at >= ?
        ORDER BY updated_at DESC
        LIMIT 20
      `,
      name,
      cutoffDate(),
    );

    return rows.map((row) => ({
      id: row.candidate_id,
      label: row.title,
      snippet: row.summary || "",
      url: row.url || undefined,
      source: row.source,
      summary: row.summary || undefined,
      confidence: readConfidence(row.raw_json),
    }));
  } catch {
    return [];
  }
}

export async function writePersonKnowledgeCache(name: string, candidates: PersonCandidate[]) {
  if (!candidates.length) return;
  try {
    await ensureCacheTable();
    for (const candidate of candidates) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO person_knowledge_cache
            (id, name, candidate_id, source, title, summary, url, raw_json, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(name, candidate_id) DO UPDATE SET
            source = excluded.source,
            title = excluded.title,
            summary = excluded.summary,
            url = excluded.url,
            raw_json = excluded.raw_json,
            updated_at = CURRENT_TIMESTAMP
        `,
        `${name}:${candidate.id}`,
        name,
        candidate.id,
        candidate.source || "unknown",
        candidate.label,
        candidate.summary || candidate.snippet,
        candidate.url || null,
        JSON.stringify({
          confidence: candidate.confidence,
          title: candidate.title,
          company: candidate.company,
          region: candidate.region,
        }),
      );
    }
  } catch {
    // Cache writes must never block candidate confirmation.
  }
}

function readConfidence(raw: string | null): number | undefined {
  if (!raw) return undefined;
  try {
    const data = JSON.parse(raw) as { confidence?: number };
    return typeof data.confidence === "number" ? data.confidence : undefined;
  } catch {
    return undefined;
  }
}
