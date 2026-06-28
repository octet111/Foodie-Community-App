import { createClient } from "@/lib/supabase/server";
import type { DraftInputParams, ShopCandidate } from "@/lib/draft/types";
import type { ShopRarity } from "@/lib/constants";

const HIGH_RARITY: ShopRarity[] = ["months_wait", "members_only", "referral_only"];

function rarityScore(rarity: ShopRarity): number {
  switch (rarity) {
    case "members_only":
      return 5;
    case "months_wait":
      return 4;
    case "referral_only":
      return 3;
    case "reservable":
      return 2;
    default:
      return 1;
  }
}

function dedupeByShopId(candidates: ShopCandidate[]): ShopCandidate[] {
  const map = new Map<string, ShopCandidate>();
  for (const c of candidates) {
    const existing = map.get(c.shop_id);
    if (!existing || rarityScore(c.rarity) > rarityScore(existing.rarity)) {
      map.set(c.shop_id, c);
    }
  }
  return Array.from(map.values());
}

function sortCandidates(candidates: ShopCandidate[], preferHighRarity: boolean): ShopCandidate[] {
  return [...candidates].sort((a, b) => {
    const scoreDiff = rarityScore(b.rarity) - rarityScore(a.rarity);
    if (preferHighRarity && scoreDiff !== 0) return scoreDiff;
    return a.name.localeCompare(b.name, "ja");
  });
}

function matchesArea(area: string | null, filter: string): boolean {
  if (!filter.trim()) return true;
  if (!area) return false;
  return area.includes(filter.trim()) || filter.trim().includes(area);
}

export async function collectShopCandidates(
  userId: string,
  inputParams: DraftInputParams,
): Promise<ShopCandidate[]> {
  const supabase = await createClient();
  const origins = inputParams.origins ?? [];
  const areaFilter = inputParams.area?.trim() ?? "";
  const preferHighRarity =
    (inputParams.concept_free_text ?? "").includes("難") ||
    (inputParams.concept_free_text ?? "").includes("制覇") ||
    (inputParams.headcount ?? 0) <= 6;

  const collected: ShopCandidate[] = [];

  if (origins.includes("stock")) {
    const { data } = await supabase
      .from("stocks")
      .select("shop:shops(id, name, area, rarity)")
      .eq("user_id", userId);

    for (const row of data ?? []) {
      const shop = row.shop as {
        id: string;
        name: string;
        area: string | null;
        rarity: ShopRarity;
      } | null;
      if (!shop || !matchesArea(shop.area, areaFilter)) continue;
      collected.push({
        shop_id: shop.id,
        name: shop.name,
        area: shop.area,
        rarity: shop.rarity,
      });
    }
  }

  if (origins.includes("claim")) {
    const { data } = await supabase
      .from("secure_claims")
      .select("claim_type, note, shop:shops(id, name, area, rarity)");

    for (const row of data ?? []) {
      const shop = row.shop as {
        id: string;
        name: string;
        area: string | null;
        rarity: ShopRarity;
      } | null;
      if (!shop || !matchesArea(shop.area, areaFilter)) continue;
      collected.push({
        shop_id: shop.id,
        name: shop.name,
        area: shop.area,
        rarity: shop.rarity,
        claim_note: row.note,
        claim_type: row.claim_type,
      });
    }
  }

  if (origins.includes("free")) {
    let query = supabase.from("shops").select("id, name, area, rarity");
    if (areaFilter) {
      query = query.ilike("area", `%${areaFilter}%`);
    }
    const { data } = await query.order("created_at", { ascending: false }).limit(40);

    for (const shop of data ?? []) {
      collected.push({
        shop_id: shop.id,
        name: shop.name,
        area: shop.area,
        rarity: shop.rarity,
      });
    }
  }

  const deduped = dedupeByShopId(collected);
  return sortCandidates(deduped, preferHighRarity);
}

/** URL 起点店を先頭にマージ（shop_id 重複は URL 側を優先） */
export function mergeUrlShopCandidate(
  urlCandidate: ShopCandidate,
  others: ShopCandidate[],
): ShopCandidate[] {
  const rest = others.filter((c) => c.shop_id !== urlCandidate.shop_id);
  return sortCandidates([urlCandidate, ...rest], false);
}

export function formatCandidatesForPrompt(candidates: ShopCandidate[]): string {
  return candidates
    .map((c) => {
      const parts = [
        `shop_id: ${c.shop_id}`,
        `name: ${c.name}`,
        `area: ${c.area ?? "未設定"}`,
        `rarity: ${c.rarity}`,
      ];
      if (c.url) parts.push(`url: ${c.url}`);
      if (c.ogp_description) {
        const desc = c.ogp_description.replace(/\s+/g, " ").slice(0, 400);
        parts.push(`page_description: ${desc}`);
      }
      if (c.claim_note) parts.push(`claim_note: ${c.claim_note}`);
      if (c.claim_type) parts.push(`claim_type: ${c.claim_type}`);
      if (c.source === "url") parts.push(`source: url（ユーザー指定）`);
      return `- ${parts.join(", ")}`;
    })
    .join("\n");
}

export function isHighRarityShop(rarity: ShopRarity): boolean {
  return HIGH_RARITY.includes(rarity);
}
