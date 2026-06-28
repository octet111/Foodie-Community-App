import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

type DeleteStockOptions = {
  ownerId: string;
  asAdmin?: boolean;
};

type DeleteShopOptions = {
  creatorId: string;
  asAdmin?: boolean;
};

export async function deleteUserStock(
  supabase: Client,
  stockId: string,
  { ownerId, asAdmin = false }: DeleteStockOptions,
): Promise<{ error: string | null }> {
  let query = supabase.from("stocks").delete().eq("id", stockId);
  if (!asAdmin) {
    query = query.eq("user_id", ownerId);
  }

  const { error } = await query;
  return { error: error?.message ?? null };
}

export async function deleteShopIfAllowed(
  supabase: Client,
  shopId: string,
  { creatorId, asAdmin = false }: DeleteShopOptions,
): Promise<{ error: string | null }> {
  const { count, error: countError } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .is("deleted_at", null);

  if (countError) {
    return { error: countError.message };
  }

  if (count && count > 0) {
    return { error: null };
  }

  let query = supabase.from("shops").delete().eq("id", shopId);
  if (!asAdmin) {
    query = query.eq("created_by", creatorId);
  }

  const { error: deleteError } = await query;
  return { error: deleteError?.message ?? null };
}
