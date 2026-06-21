import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_COMMUNITY_NAME,
  DEFAULT_LOGO_CHAR,
} from "@/lib/constants";
import { getCommunityLogoUrl, getAvatarUrl } from "@/lib/storage";
import type { NotificationItem } from "@/lib/notifications-data";

export type CommunitySettings = {
  name: string;
  logoPath: string | null;
  logoUrl: string | null;
  logoChar: string;
};

export type AppProfile = {
  id: string;
  nickname: string;
  role: "member" | "admin";
  avatarPath: string | null;
  avatarUrl: string | null;
};

export async function getCommunitySettings(): Promise<CommunitySettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("community_settings")
    .select("name, logo_path")
    .limit(1)
    .maybeSingle();

  const name = data?.name ?? DEFAULT_COMMUNITY_NAME;
  const logoPath = data?.logo_path ?? null;
  const logoUrl = logoPath
    ? getCommunityLogoUrl(supabase, logoPath)
    : null;

  return {
    name,
    logoPath,
    logoUrl,
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
    .select("id, nickname, role, avatar_path")
    .eq("id", user.id)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    nickname: data.nickname,
    role: data.role,
    avatarPath: data.avatar_path,
    avatarUrl: getAvatarUrl(supabase, data.avatar_path),
  };
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, created_at, read_at, event_id")
    .order("created_at", { ascending: false })
    .limit(30);

  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    read: row.read_at !== null,
    eventId: row.event_id,
  }));
}
