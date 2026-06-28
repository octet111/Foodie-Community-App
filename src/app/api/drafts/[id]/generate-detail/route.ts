import { createClient } from "@/lib/supabase/server";
import {
  checkGenerationRateLimit,
  getAuthenticatedUserId,
  jsonError,
  jsonUnauthorized,
} from "@/lib/draft/auth";
import { GEMINI_MODEL } from "@/lib/draft/constants";
import {
  buildDetailUserPrompt,
  DETAIL_RESPONSE_SCHEMA,
  DETAIL_SYSTEM_INSTRUCTION,
} from "@/lib/draft/prompts";
import { selectedConceptSchema } from "@/lib/draft/schemas";
import type { DraftPart, ShopCandidate } from "@/lib/draft/types";
import {
  descriptionQualityIssue,
  isValidShopId,
  validateDraftParts,
} from "@/lib/draft/validation";
import { generateStructuredJson } from "@/lib/gemini";
import type { Json } from "@/types/database";

type DetailResponse = {
  title: string;
  description: string;
  recommended_shop_id: string;
  parts: DraftPart[];
};

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return jsonUnauthorized();

  const { id: draftId } = await context.params;

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

  const parsed = selectedConceptSchema.safeParse(
    (body as { selected_concept?: unknown }).selected_concept ?? body,
  );
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "コンセプトが不正です", 400);
  }

  const selectedConcept = parsed.data;
  const supabase = await createClient();

  const { data: draft, error: draftError } = await supabase
    .from("event_drafts")
    .select("id, status")
    .eq("id", draftId)
    .eq("created_by", userId)
    .eq("status", "generated")
    .maybeSingle();

  if (draftError || !draft) {
    return jsonError("ドラフトが見つかりません", 404);
  }

  const { data: candidateRows } = await supabase
    .from("draft_shop_candidates")
    .select("shop_id, reason, shop:shops(name, area, rarity)")
    .eq("draft_id", draftId);

  const candidates: ShopCandidate[] = (candidateRows ?? [])
    .filter((row) => row.shop)
    .map((row) => {
      const shop = row.shop as { name: string; area: string | null; rarity: ShopCandidate["rarity"] };
      return {
        shop_id: row.shop_id,
        name: shop.name,
        area: shop.area,
        rarity: shop.rarity,
        claim_note: row.reason,
      };
    });

  if (!isValidShopId(selectedConcept.recommended_shop_id, candidates)) {
    return jsonError("選択コンセプトの店が候補リストにありません", 400);
  }

  await supabase
    .from("event_drafts")
    .update({
      selected_concept: selectedConcept,
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId);

  const userPrompt = buildDetailUserPrompt(selectedConcept, candidates);
  let geminiResult = await generateStructuredJson<DetailResponse>(
    DETAIL_SYSTEM_INSTRUCTION,
    userPrompt,
    DETAIL_RESPONSE_SCHEMA,
  );

  async function validateDetail(data: DetailResponse): Promise<string | null> {
    if (!isValidShopId(data.recommended_shop_id, candidates)) {
      return "候補外の shop_id です";
    }
    const partError = validateDraftParts(data.parts);
    if (partError) return partError;
    return descriptionQualityIssue(data.description, candidates);
  }

  if (geminiResult.ok) {
    const issue = await validateDetail(geminiResult.data);
    if (issue) {
      const retry = await generateStructuredJson<DetailResponse>(
        DETAIL_SYSTEM_INSTRUCTION,
        `${userPrompt}\n\n前回の問題: ${issue}。修正して再生成してください。`,
        DETAIL_RESPONSE_SCHEMA,
      );
      if (retry.ok) geminiResult = retry;
    }
  }

  if (!geminiResult.ok) {
    return jsonError(geminiResult.message, 502);
  }

  const detail = geminiResult.data;
  const finalIssue = await validateDetail(detail);
  if (finalIssue) {
    return jsonError(`集客文の品質チェックに失敗しました: ${finalIssue}`, 502);
  }

  const { error: updateError } = await supabase
    .from("event_drafts")
    .update({
      title: detail.title.trim(),
      description: detail.description.trim(),
      shop_id: detail.recommended_shop_id,
      parts: detail.parts,
      generation_phase: "detail",
      model: GEMINI_MODEL,
      raw_response: geminiResult.raw as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId);

  if (updateError) {
    return jsonError(updateError.message, 500);
  }

  return Response.json({
    draft_id: draftId,
    title: detail.title,
    description: detail.description,
    shop_id: detail.recommended_shop_id,
    parts: detail.parts,
    rate_limit: { remaining: rate.remaining - 1, limit: rate.limit },
  });
}
