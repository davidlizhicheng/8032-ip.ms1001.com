import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildSelfProvidedCandidate,
  lookupPersonCandidatesFromEncyclopedia,
} from "@/lib/search/lookup-person-encyclopedia";

const Schema = z.object({
  name: z.string().min(1),
  rawText: z.string().optional(),
});

/** 人物消歧：优先检索百度百科 + 维基百科，每次均需确认后再生成 */
export async function POST(request: NextRequest) {
  try {
    const body = Schema.parse(await request.json());
    const name = body.name.trim();
    const lookup = await lookupPersonCandidatesFromEncyclopedia(name);

    const candidates =
      lookup.candidates.length > 0
        ? lookup.candidates
        : [buildSelfProvidedCandidate(name, body.rawText)];

    return NextResponse.json({
      needsConfirmation: true,
      name,
      reason: lookup.reason,
      allowCompare: lookup.allowCompare,
      candidates,
      sourcesSearched: lookup.sourcesSearched,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "检查失败" },
      { status: 500 },
    );
  }
}
