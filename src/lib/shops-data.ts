import type { ClaimType } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Shop = Tables<"shops">;

export type StockItem = {
  id: string;
  memo: string | null;
  shop: Shop;
};

export type ClaimItem = {
  id: string;
  claim_type: ClaimType;
  note: string | null;
  user_id: string;
  nickname: string;
};

export type ShopClaimGroup = {
  shop: Shop;
  claims: ClaimItem[];
};

export type ShopEvent = {
  id: string;
  title: string;
  held_at: string;
  status: Tables<"events">["status"];
};

export async function getUserStocks(userId: string): Promise<StockItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stocks")
    .select("id, memo, shop:shops(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data
    .filter((row) => row.shop)
    .map((row) => ({
      id: row.id,
      memo: row.memo,
      shop: row.shop as Shop,
    }));
}

export async function getClaimGroups(): Promise<ShopClaimGroup[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("secure_claims")
    .select(
      "id, claim_type, note, user_id, shop:shops(*), profile:profiles(nickname)",
    )
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const groups = new Map<string, ShopClaimGroup>();

  for (const row of data) {
    if (!row.shop) continue;
    const shop = row.shop as Shop;
    const profile = row.profile as { nickname: string } | null;
    const claim: ClaimItem = {
      id: row.id,
      claim_type: row.claim_type,
      note: row.note,
      user_id: row.user_id,
      nickname: profile?.nickname ?? "不明",
    };

    const existing = groups.get(shop.id);
    if (existing) {
      existing.claims.push(claim);
    } else {
      groups.set(shop.id, { shop, claims: [claim] });
    }
  }

  return Array.from(groups.values());
}

export async function getShopById(id: string): Promise<Shop | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shops")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function getShopClaims(shopId: string): Promise<ClaimItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("secure_claims")
    .select("id, claim_type, note, user_id, profile:profiles(nickname)")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    claim_type: row.claim_type,
    note: row.note,
    user_id: row.user_id,
    nickname: (row.profile as { nickname: string } | null)?.nickname ?? "不明",
  }));
}

export async function getShopEvents(shopId: string): Promise<ShopEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, held_at, status")
    .eq("shop_id", shopId)
    .is("deleted_at", null)
    .order("held_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function getUserClaimForShop(
  shopId: string,
  userId: string,
): Promise<ClaimItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("secure_claims")
    .select("id, claim_type, note, user_id, profile:profiles(nickname)")
    .eq("shop_id", shopId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    claim_type: data.claim_type,
    note: data.note,
    user_id: data.user_id,
    nickname:
      (data.profile as { nickname: string } | null)?.nickname ?? "不明",
  };
}
