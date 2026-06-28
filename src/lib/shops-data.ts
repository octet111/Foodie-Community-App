import type { ClaimType } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { getAvatarUrl } from "@/lib/storage";
import type { Tables } from "@/types/database";

export type Shop = Tables<"shops">;

export type StockItem = {
  id: string;
  memo: string | null;
  is_private: boolean;
  user_id: string;
  nickname?: string;
  has_event?: boolean;
  shop: Shop;
};

export type ClaimItem = {
  id: string;
  claim_type: ClaimType;
  note: string | null;
  user_id: string;
  nickname: string;
  avatarUrl: string | null;
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

export type UserStock = {
  id: string;
  memo: string | null;
  is_private: boolean;
};

export async function getShopIdsWithEvents(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("shop_id")
    .is("deleted_at", null);

  if (error || !data) return new Set();
  return new Set(data.map((row) => row.shop_id));
}

export function markPlannedStocks(
  stocks: StockItem[],
  plannedShopIds: Set<string>,
): StockItem[] {
  return stocks.map((item) => ({
    ...item,
    has_event: plannedShopIds.has(item.shop.id),
  }));
}

export async function getUserStocks(userId: string): Promise<StockItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stocks")
    .select("id, memo, is_private, user_id, shop:shops(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data
    .filter((row) => row.shop)
    .map((row) => ({
      id: row.id,
      memo: row.memo,
      is_private: row.is_private,
      user_id: row.user_id,
      shop: row.shop as Shop,
    }));
}

export async function getPublicStocks(excludeUserId: string): Promise<StockItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stocks")
    .select(
      "id, memo, is_private, user_id, shop:shops(*), profile:profiles(nickname)",
    )
    .eq("is_private", false)
    .neq("user_id", excludeUserId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data
    .filter((row) => row.shop)
    .map((row) => {
      const profile = row.profile as { nickname: string } | null;
      return {
        id: row.id,
        memo: row.memo,
        is_private: row.is_private,
        user_id: row.user_id,
        nickname: profile?.nickname,
        shop: row.shop as Shop,
      };
    });
}

export async function getAllStocksExcept(excludeUserId: string): Promise<StockItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stocks")
    .select(
      "id, memo, is_private, user_id, shop:shops(*), profile:profiles(nickname)",
    )
    .neq("user_id", excludeUserId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data
    .filter((row) => row.shop)
    .map((row) => {
      const profile = row.profile as { nickname: string } | null;
      return {
        id: row.id,
        memo: row.memo,
        is_private: row.is_private,
        user_id: row.user_id,
        nickname: profile?.nickname,
        shop: row.shop as Shop,
      };
    });
}

export async function getClaimGroups(): Promise<ShopClaimGroup[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("secure_claims")
    .select(
      "id, claim_type, note, user_id, shop:shops(*), profile:profiles(nickname, avatar_path)",
    )
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const groups = new Map<string, ShopClaimGroup>();

  for (const row of data) {
    if (!row.shop) continue;
    const shop = row.shop as Shop;
    const profile = row.profile as {
      nickname: string;
      avatar_path: string | null;
    } | null;
    const claim: ClaimItem = {
      id: row.id,
      claim_type: row.claim_type,
      note: row.note,
      user_id: row.user_id,
      nickname: profile?.nickname ?? "不明",
      avatarUrl: getAvatarUrl(supabase, profile?.avatar_path),
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

/** AI企画生成の店選択用（店リスト登録済みの全店） */
export async function getShopListForPicker(): Promise<Shop[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shops")
    .select("*")
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data;
}

export async function getShopClaims(shopId: string): Promise<ClaimItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("secure_claims")
    .select("id, claim_type, note, user_id, profile:profiles(nickname, avatar_path)")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => {
    const profile = row.profile as {
      nickname: string;
      avatar_path: string | null;
    } | null;
    return {
      id: row.id,
      claim_type: row.claim_type,
      note: row.note,
      user_id: row.user_id,
      nickname: profile?.nickname ?? "不明",
      avatarUrl: getAvatarUrl(supabase, profile?.avatar_path),
    };
  });
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
    .select("id, claim_type, note, user_id, profile:profiles(nickname, avatar_path)")
    .eq("shop_id", shopId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const profile = data.profile as {
    nickname: string;
    avatar_path: string | null;
  } | null;

  return {
    id: data.id,
    claim_type: data.claim_type,
    note: data.note,
    user_id: data.user_id,
    nickname: profile?.nickname ?? "不明",
    avatarUrl: getAvatarUrl(supabase, profile?.avatar_path),
  };
}

export async function getUserStockForShop(
  shopId: string,
  userId: string,
): Promise<UserStock | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stocks")
    .select("id, memo, is_private")
    .eq("shop_id", shopId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}
