import { createClient } from "@/lib/supabase/server";
import {
  getAuthenticatedUserId,
  jsonError,
  jsonUnauthorized,
} from "@/lib/draft/auth";
import { adoptSchema } from "@/lib/draft/schemas";
import { validateDraftParts } from "@/lib/draft/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return jsonUnauthorized();

  const { id: draftId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("リクエストボディが不正です", 400);
  }

  const parsed = adoptSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("開催日時（held_at）を入力してください", 400);
  }

  const supabase = await createClient();

  const { data: draft } = await supabase
    .from("event_drafts")
    .select("id, shop_id, title, parts, status")
    .eq("id", draftId)
    .eq("created_by", userId)
    .eq("status", "generated")
    .maybeSingle();

  if (!draft) return jsonError("ドラフトが見つかりません", 404);

  if (!draft.shop_id || !draft.title?.trim()) {
    return jsonError("タイトルと店の選択が必要です", 400);
  }

  const partError = validateDraftParts(
    (draft.parts as { name: string; capacity: number; fee_estimate: number; sort_order: number }[]) ?? [],
  );
  if (partError) return jsonError(partError, 400);

  const { data: eventId, error } = await supabase.rpc("adopt_event_draft", {
    p_draft_id: draftId,
    p_held_at: parsed.data.held_at,
  });

  if (error) {
    return jsonError(error.message, 500);
  }

  return Response.json({ event_id: eventId });
}
