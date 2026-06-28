import { createClient } from "@/lib/supabase/server";
import { DRAFT_GENERATION_DAILY_LIMIT } from "@/lib/draft/constants";

export async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function checkGenerationRateLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
}> {
  const supabase = await createClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("event_drafts")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId)
    .gte("created_at", startOfDay.toISOString());

  if (error) {
    return {
      allowed: true,
      remaining: DRAFT_GENERATION_DAILY_LIMIT,
      limit: DRAFT_GENERATION_DAILY_LIMIT,
    };
  }

  const used = count ?? 0;
  const remaining = Math.max(0, DRAFT_GENERATION_DAILY_LIMIT - used);
  return {
    allowed: used < DRAFT_GENERATION_DAILY_LIMIT,
    remaining,
    limit: DRAFT_GENERATION_DAILY_LIMIT,
  };
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function jsonUnauthorized() {
  return jsonError("ログインが必要です", 401);
}
