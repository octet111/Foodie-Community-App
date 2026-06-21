import { DEFAULT_COMMUNITY_NAME } from "@/lib/constants";
import {
  DEFAULT_EMAIL_BODY_TEMPLATE,
  DEFAULT_EMAIL_SUBJECT_TEMPLATE,
  DEFAULT_REMINDER_DAY_BEFORE_TIME,
  DEFAULT_REMINDER_DAY_OF_TIME,
  formatTimeForInput,
} from "@/lib/reminder-templates";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type CommunitySettingsFull = {
  id: string | null;
  name: string;
  logoPath: string | null;
  transferInfo: string;
  reminderDayBeforeTime: string;
  reminderDayOfTime: string;
  emailReminderSubjectTemplate: string;
  emailReminderBodyTemplate: string;
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
    .select(
      "id, name, logo_path, transfer_info, reminder_day_before_time, reminder_day_of_time, email_reminder_subject_template, email_reminder_body_template",
    )
    .limit(1)
    .maybeSingle();

  return {
    id: data?.id ?? null,
    name: data?.name ?? DEFAULT_COMMUNITY_NAME,
    logoPath: data?.logo_path ?? null,
    transferInfo: data?.transfer_info ?? "",
    reminderDayBeforeTime: formatTimeForInput(
      data?.reminder_day_before_time ?? DEFAULT_REMINDER_DAY_BEFORE_TIME,
    ),
    reminderDayOfTime: formatTimeForInput(
      data?.reminder_day_of_time ?? DEFAULT_REMINDER_DAY_OF_TIME,
    ),
    emailReminderSubjectTemplate:
      data?.email_reminder_subject_template ?? DEFAULT_EMAIL_SUBJECT_TEMPLATE,
    emailReminderBodyTemplate:
      data?.email_reminder_body_template ?? DEFAULT_EMAIL_BODY_TEMPLATE,
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
