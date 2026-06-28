import "server-only";

import { fetchOgp } from "@/lib/ogp";
import { createClient } from "@/lib/supabase/server";
import type { ShopCandidate } from "@/lib/draft/types";
import type { ShopRarity } from "@/lib/constants";

export type UrlShopResolveResult =
  | { ok: true; candidate: ShopCandidate }
  | { ok: false; error: string };

function normalizeUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    parsed.hash = "";
    return parsed.href.replace(/\/$/, "");
  } catch {
    return null;
  }
}

function urlVariants(normalized: string): string[] {
  return [normalized, `${normalized}/`];
}

export async function resolveShopFromUrl(
  userId: string,
  rawUrl: string,
): Promise<UrlShopResolveResult> {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) {
    return { ok: false, error: "有効な URL（http/https）を入力してください" };
  }

  const supabase = await createClient();
  const ogp = await fetchOgp(supabase, normalized);
  if (!ogp.title.trim()) {
    return {
      ok: false,
      error: "URL から店情報を取得できませんでした。食べログ・Google Maps 等のリンクを試してください。",
    };
  }

  for (const url of urlVariants(normalized)) {
    const { data: existing } = await supabase
      .from("shops")
      .select("id, name, area, rarity, url, ogp_description")
      .eq("url", url)
      .maybeSingle();

    if (existing) {
      return {
        ok: true,
        candidate: {
          shop_id: existing.id,
          name: existing.name,
          area: existing.area,
          rarity: existing.rarity as ShopRarity,
          url: existing.url,
          ogp_description: (existing.ogp_description ?? ogp.description) || null,
          source: "url",
        },
      };
    }
  }

  const { data: created, error: insertError } = await supabase
    .from("shops")
    .insert({
      name: ogp.title.trim(),
      area: null,
      url: normalized,
      ogp_description: ogp.description.trim() || null,
      ogp_image_url: ogp.image.trim() || null,
      created_by: userId,
    })
    .select("id, name, area, rarity, url, ogp_description")
    .single();

  if (insertError || !created) {
    return {
      ok: false,
      error: insertError?.message ?? "店情報の保存に失敗しました",
    };
  }

  return {
    ok: true,
    candidate: {
      shop_id: created.id,
      name: created.name,
      area: created.area,
      rarity: created.rarity as ShopRarity,
      url: created.url,
      ogp_description: (created.ogp_description ?? ogp.description) || null,
      source: "url",
    },
  };
}
