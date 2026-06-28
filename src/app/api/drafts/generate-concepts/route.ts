import { createClient } from "@/lib/supabase/server";
import {
  checkGenerationRateLimit,
  getAuthenticatedUserId,
  jsonError,
  jsonUnauthorized,
} from "@/lib/draft/auth";
import {
  collectShopCandidates,
} from "@/lib/draft/collect-candidates";
import { GEMINI_MODEL } from "@/lib/draft/constants";
import {
  buildConceptUserPrompt,
  CONCEPT_RESPONSE_SCHEMA,
  CONCEPT_SYSTEM_INSTRUCTION,
} from "@/lib/draft/prompts";
import { inputParamsSchema } from "@/lib/draft/schemas";
import type { ConceptOption } from "@/lib/draft/types";
import { sanitizeConceptOption } from "@/lib/draft/validation";
import { generateStructuredJson } from "@/lib/gemini";
import type { Json } from "@/types/database";

type ConceptResponse = { concepts: ConceptOption[] };

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return jsonUnauthorized();

  const rate = await checkGenerationRateLimit(userId);
  if (!rate.allowed) {
    return jsonError(
      `本日の AI 生成上限（${rate.limit}回）に達しました。明日またお試しください。`,
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("リクエストボディが不正です", 400);
  }

  const parsed = inputParamsSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "入力が不正です", 400);
  }

  const inputParams = parsed.data;
  const candidates = await collectShopCandidates(userId, inputParams);

  if (candidates.length === 0) {
    return Response.json({
      needs_shops: true,
      message:
        "候補店がありません。行きたい店をストックするか、確保宣言を登録してから再度お試しください。",
    });
  }

  const userPrompt = buildConceptUserPrompt(inputParams, candidates);
  let geminiResult = await generateStructuredJson<ConceptResponse>(
    CONCEPT_SYSTEM_INSTRUCTION,
    userPrompt,
    CONCEPT_RESPONSE_SCHEMA,
  );

  let concepts = geminiResult.ok ? geminiResult.data.concepts ?? [] : [];

  let sanitized = concepts
    .map((c) => sanitizeConceptOption(c, candidates))
    .filter((c): c is ConceptOption => c !== null);

  if (sanitized.length < concepts.length && geminiResult.ok) {
    const retry = await generateStructuredJson<ConceptResponse>(
      CONCEPT_SYSTEM_INSTRUCTION,
      `${userPrompt}\n\n前回、候補外の shop_id が含まれていました。allowed_shop_ids 以外は絶対に使わないでください。`,
      CONCEPT_RESPONSE_SCHEMA,
    );
    if (retry.ok) {
      geminiResult = retry;
      concepts = retry.data.concepts ?? [];
      sanitized = concepts
        .map((c) => sanitizeConceptOption(c, candidates))
        .filter((c): c is ConceptOption => c !== null);
    }
  }

  if (!geminiResult.ok) {
    return jsonError(geminiResult.message, 502);
  }

  if (sanitized.length === 0) {
    return jsonError("有効なコンセプト案を生成できませんでした", 502);
  }

  const supabase = await createClient();
  const { data: draft, error: insertError } = await supabase
    .from("event_drafts")
    .insert({
      created_by: userId,
      status: "generated",
      generation_phase: "concept",
      input_params: inputParams,
      concept_options: sanitized,
      model: GEMINI_MODEL,
      raw_response: geminiResult.raw as Json,
    })
    .select("id")
    .single();

  if (insertError || !draft) {
    return jsonError(insertError?.message ?? "ドラフトの保存に失敗しました", 500);
  }

  const candidateRows = candidates.map((c, i) => ({
    draft_id: draft.id,
    shop_id: c.shop_id,
    reason: c.claim_note ?? null,
    sort_order: i + 1,
  }));

  await supabase.from("draft_shop_candidates").insert(candidateRows);

  return Response.json({
    draft_id: draft.id,
    concept_options: sanitized,
    rate_limit: { remaining: rate.remaining - 1, limit: rate.limit },
  });
}
