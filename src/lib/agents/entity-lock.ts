import { detectEntityType } from "@/lib/ai/detect-type";
import {
  buildSelfProvidedCandidate,
  lookupPersonCandidatesFromEncyclopedia,
  resolveEncyclopediaCandidate,
} from "@/lib/search/lookup-person-encyclopedia";
import { resolveRegistryCandidate } from "@/lib/search/person-disambiguation-registry";
import { parsePersonQuery, pickAutoConfirmCandidateId } from "@/lib/search/parse-person-query";
import type { EntityLockResult, PipelineContext } from "@/lib/agents/types";
import type { EntityType } from "@/lib/schemas/entity";
import { createStreamEmitter } from "@/lib/agents/stream-events";

export class EntityLockRequiredError extends Error {
  personName: string;
  reason: string;
  candidates: Array<{
    id: string;
    label: string;
    title?: string;
    company?: string;
    snippet: string;
    url?: string;
    region?: string;
    source?: string;
    summary?: string;
    confidence?: number;
  }>;
  allowCompare: boolean;

  constructor(
    personName: string,
    reason: string,
    candidates: EntityLockRequiredError["candidates"],
    allowCompare: boolean,
  ) {
    super(reason);
    this.personName = personName;
    this.reason = reason;
    this.candidates = candidates;
    this.allowCompare = allowCompare;
  }
}

/** 实体锁定：百科/Wikidata 候选确认，未确认不允许进入 Research */
export async function lockEntity(
  name: string,
  options: {
    entityType?: string;
    confirmedCandidateId?: string;
    companyHint?: string;
  },
  ctx: PipelineContext = {},
): Promise<EntityLockResult> {
  const stream = createStreamEmitter(ctx);
  stream.status(`正在识别对象：${name}`, "entity_lock");

  const detected = detectEntityType(name, options.entityType);
  const type = detected.type as EntityType;
  const parsed = type === "person" ? parsePersonQuery(name, options.companyHint) : null;

  if (type === "person" && !options.confirmedCandidateId) {
    stream.status("正在检索百科候选…", "entity_lock");
    const lookup = await lookupPersonCandidatesFromEncyclopedia(parsed!.displayName, {
      companyHint: parsed!.companyHint,
    });
    const autoId = pickAutoConfirmCandidateId(
      lookup.candidates,
      parsed!.personName,
      parsed!.companyHint,
    );
    if (autoId) {
      stream.status(`已自动匹配百科条目：${parsed!.personName}`, "entity_lock");
      return lockEntity(name, { ...options, confirmedCandidateId: autoId }, ctx);
    }
    throw new EntityLockRequiredError(
      parsed!.displayName,
      lookup.reason,
      lookup.candidates.length > 0
        ? lookup.candidates.map(({ id, label, title, company, snippet, url, region, source, summary, confidence }) => ({
            id,
            label,
            title,
            company,
            snippet,
            url,
            region,
            source,
            summary,
            confidence,
          }))
        : [buildSelfProvidedCandidate(parsed!.personName, parsed!.displayName)],
      lookup.allowCompare,
    );
  }

  let identityHint = "";
  let baikeUrl: string | undefined;
  let wikiUrl: string | undefined;
  const lookupName = parsed?.personName || name;

  if (options.confirmedCandidateId) {
    const resolved = await resolveEncyclopediaCandidate(lookupName, options.confirmedCandidateId);
    identityHint = resolved?.identityHint || "";
    baikeUrl = resolved?.baikeUrl;
    wikiUrl = resolved?.wikiUrl;
    if (!identityHint) {
      const reg = resolveRegistryCandidate(lookupName, options.confirmedCandidateId);
      identityHint = reg?.identityHint || "";
    }
  }

  if (parsed?.companyHint?.trim()) {
    const companyLine = `关联单位/组织：${parsed.companyHint.trim()}`;
    identityHint = identityHint ? `${identityHint}\n${companyLine}` : companyLine;
  }

  const lockedName = parsed?.personName || name;
  stream.status(`对象已锁定：${lockedName}（${type}）`, "entity_lock", { identityHint });

  return {
    name: lockedName,
    type,
    subtype: detected.subtype,
    identityHint,
    confirmedCandidateId: options.confirmedCandidateId,
    baikeUrl,
    wikiUrl,
    locked: true,
  };
}
