import { createClient } from "@/lib/supabase/server";
import type { ConceptOption, DraftPart, DraftSummary, ShopCandidate } from "@/lib/draft/types";
import type { Tables } from "@/types/database";

export type EventDraftRow = Tables<"event_drafts">;

export type DraftDetail = {
  id: string;
  status: EventDraftRow["status"];
  generation_phase: string;
  input_params: Record<string, unknown>;
  concept_options: ConceptOption[];
  selected_concept: ConceptOption | null;
  title: string | null;
  description: string | null;
  shop_id: string | null;
  parts: DraftPart[];
  candidates: ShopCandidate[];
  created_at: string;
  updated_at: string;
};

export async function getUserDrafts(userId: string): Promise<DraftSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_drafts")
    .select("id, status, generation_phase, title, created_at, updated_at")
    .eq("created_by", userId)
    .eq("status", "generated")
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function getDraftById(
  draftId: string,
  userId: string,
): Promise<DraftDetail | null> {
  const supabase = await createClient();
  const { data: draft, error } = await supabase
    .from("event_drafts")
    .select("*")
    .eq("id", draftId)
    .eq("created_by", userId)
    .maybeSingle();

  if (error || !draft) return null;

  const { data: candidateRows } = await supabase
    .from("draft_shop_candidates")
    .select("shop_id, reason, sort_order, shop:shops(name, area, rarity)")
    .eq("draft_id", draftId)
    .order("sort_order", { ascending: true });

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

  return {
    id: draft.id,
    status: draft.status,
    generation_phase: draft.generation_phase,
    input_params: (draft.input_params as Record<string, unknown>) ?? {},
    concept_options: (draft.concept_options as ConceptOption[]) ?? [],
    selected_concept: (draft.selected_concept as ConceptOption | null) ?? null,
    title: draft.title,
    description: draft.description,
    shop_id: draft.shop_id,
    parts: (draft.parts as DraftPart[]) ?? [],
    candidates,
    created_at: draft.created_at,
    updated_at: draft.updated_at,
  };
}
