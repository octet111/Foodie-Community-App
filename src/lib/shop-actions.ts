import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function deleteUserStock(
  supabase: Client,
  stockId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("stocks")
    .delete()
    .eq("id", stockId)
    .eq("user_id", userId);

  return { error: error?.message ?? null };
}

export async function deleteShopIfAllowed(
  supabase: Client,
  shopId: string,
  userId: string,
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

  const { error: deleteError } = await supabase
    .from("shops")
    .delete()
    .eq("id", shopId)
    .eq("created_by", userId);

  return { error: deleteError?.message ?? null };
}
