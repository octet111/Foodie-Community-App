import type { DraftOrigin } from "@/lib/draft/constants";
import type { ClaimType, ShopRarity } from "@/lib/constants";

export type DraftInputParams = {
  origins: DraftOrigin[];
  area?: string;
  headcount?: number;
  concept_free_text?: string;
  shop_url?: string;
};

export type DraftPart = {
  name: string;
  capacity: number;
  fee_estimate: number;
  sort_order: number;
};

export type ShopCandidate = {
  shop_id: string;
  name: string;
  area: string | null;
  rarity: ShopRarity;
  claim_note?: string | null;
  claim_type?: ClaimType | null;
  url?: string | null;
  ogp_description?: string | null;
  source?: string;
};

export type ConceptOption = {
  label: string;
  tone: string;
  rationale: string;
  suggested_headcount: number;
  suggested_parts: DraftPart[];
  recommended_shop_id: string;
};

export type SelectedConcept = {
  label: string;
  tone: string;
  rationale: string;
  suggested_headcount?: number;
  suggested_parts: DraftPart[];
  recommended_shop_id: string;
  is_custom?: boolean;
};

export type DraftSummary = {
  id: string;
  status: "generated" | "adopted" | "discarded";
  generation_phase: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};
