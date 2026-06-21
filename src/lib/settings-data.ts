import { DEFAULT_COMMUNITY_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type CommunitySettingsFull = {
  id: string | null;
  name: string;
  logoPath: string | null;
  transferInfo: string;
};

export type MemberRow = {
  id: string;
  nickname: string;
  role: "member" | "admin";
  created_at: string;
};

export async function getCommunitySettingsFull(): Promise<CommunitySettingsFull> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("community_settings")
    .select("id, name, logo_path, transfer_info")
    .limit(1)
    .maybeSingle();

  return {
    id: data?.id ?? null,
    name: data?.name ?? DEFAULT_COMMUNITY_NAME,
    logoPath: data?.logo_path ?? null,
    transferInfo: data?.transfer_info ?? "",
  };
}

export async function getAllMembers(): Promise<MemberRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname, role, created_at")
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    nickname: row.nickname,
    role: row.role as MemberRow["role"],
    created_at: row.created_at,
  }));
}

export type SettingsPageData = {
  settings: CommunitySettingsFull;
  members: MemberRow[];
};

export async function getSettingsPageData(): Promise<SettingsPageData> {
  const [settings, members] = await Promise.all([
    getCommunitySettingsFull(),
    getAllMembers(),
  ]);
  return { settings, members };
}

export type CommunitySettingsRow = Tables<"community_settings">;
