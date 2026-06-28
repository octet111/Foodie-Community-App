import { createClient } from "@/lib/supabase/server";
import {
  getAuthenticatedUserId,
  jsonError,
  jsonUnauthorized,
} from "@/lib/draft/auth";
import { draftPatchSchema } from "@/lib/draft/schemas";
import { isValidShopId, validateDraftParts } from "@/lib/draft/validation";
import type { ShopCandidate } from "@/lib/draft/types";
import type { TablesUpdate } from "@/types/database";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return jsonUnauthorized();

  const { id: draftId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("リクエストボディが不正です", 400);
  }

  const parsed = draftPatchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "入力が不正です", 400);
  }

  const supabase = await createClient();
  const { data: draft } = await supabase
    .from("event_drafts")
    .select("id, status")
    .eq("id", draftId)
    .eq("created_by", userId)
    .eq("status", "generated")
    .maybeSingle();

  if (!draft) return jsonError("ドラフトが見つかりません", 404);

  const updates: TablesUpdate<"event_drafts"> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.title !== undefined) updates.title = parsed.data.title.trim();
  if (parsed.data.description !== undefined) {
    updates.description = parsed.data.description.trim() || null;
  }

  if (parsed.data.shop_id !== undefined) {
    const { data: candidateRows } = await supabase
      .from("draft_shop_candidates")
      .select("shop_id, reason, shop:shops(name, area, rarity)")
      .eq("draft_id", draftId);

    const candidates: ShopCandidate[] = (candidateRows ?? [])
      .filter((row) => row.shop)
      .map((row) => {
        const shop = row.shop as {
          name: string;
          area: string | null;
          rarity: ShopCandidate["rarity"];
        };
        return {
          shop_id: row.shop_id,
          name: shop.name,
          area: shop.area,
          rarity: shop.rarity,
          claim_note: row.reason,
        };
      });

    if (!isValidShopId(parsed.data.shop_id, candidates)) {
      return jsonError("候補リストにない店は選択できません", 400);
    }
    updates.shop_id = parsed.data.shop_id;
  }

  if (parsed.data.parts !== undefined) {
    const partError = validateDraftParts(parsed.data.parts);
    if (partError) return jsonError(partError, 400);
    updates.parts = parsed.data.parts;
  }

  const { error } = await supabase
    .from("event_drafts")
    .update(updates)
    .eq("id", draftId);

  if (error) return jsonError(error.message, 500);

  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return jsonUnauthorized();

  const { id: draftId } = await context.params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_drafts")
    .update({
      status: "discarded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId)
    .eq("created_by", userId)
    .eq("status", "generated")
    .select("id")
    .maybeSingle();

  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("ドラフトが見つかりません", 404);

  return Response.json({ ok: true });
}
