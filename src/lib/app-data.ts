import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_COMMUNITY_NAME,
  DEFAULT_LOGO_CHAR,
} from "@/lib/constants";

export type CommunitySettings = {
  name: string;
  logoPath: string | null;
  logoChar: string;
};

export type AppProfile = {
  id: string;
  nickname: string;
  role: "member" | "admin";
};

export async function getCommunitySettings(): Promise<CommunitySettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("community_settings")
    .select("name, logo_path")
    .limit(1)
    .maybeSingle();

  const name = data?.name ?? DEFAULT_COMMUNITY_NAME;

  return {
    name,
    logoPath: data?.logo_path ?? null,
    logoChar: name.charAt(0) || DEFAULT_LOGO_CHAR,
  };
}

export async function getCurrentProfile(): Promise<AppProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, nickname, role")
    .eq("id", user.id)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    nickname: data.nickname,
    role: data.role,
  };
}
