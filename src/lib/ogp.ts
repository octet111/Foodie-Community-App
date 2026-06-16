import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type OgpData = {
  title: string;
  image: string;
  description: string;
};

const EMPTY_OGP: OgpData = { title: "", image: "", description: "" };

export async function fetchOgp(
  supabase: SupabaseClient<Database>,
  url: string,
): Promise<OgpData> {
  const { data, error } = await supabase.functions.invoke<OgpData>("ogp-fetch", {
    body: { url },
  });

  if (error || !data) return EMPTY_OGP;

  return {
    title: data.title ?? "",
    image: data.image ?? "",
    description: data.description ?? "",
  };
}
