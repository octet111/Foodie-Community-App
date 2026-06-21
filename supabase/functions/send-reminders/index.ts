import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildAdminFailureHtml,
  buildReminderHtml,
  buildReminderSubject,
  type ReminderEmailProps,
} from "./email-template.ts";

const JST = "Asia/Tokyo";

type ReminderRow = {
  id: string;
  event_id: string;
  remind_at: string;
  channel: string;
};

type EventRow = {
  id: string;
  title: string;
  held_at: string;
  location: string | null;
  deleted_at: string | null;
  shop: { name: string } | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function formatHeldAtJst(heldAt: string): string {
  const d = new Date(heldAt);
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST,
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${get("month")}/${get("day")}（${get("weekday")}）${get("hour")}:${get("minute")}`;
}

function reminderKind(
  remindAt: string,
  heldAt: string,
): "day_before" | "day_of" {
  const heldKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: JST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(heldAt));

  const remindKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: JST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(remindAt));

  return remindKey < heldKey ? "day_before" : "day_of";
}

function notificationCopy(
  kind: "day_before" | "day_of",
  eventTitle: string,
  shopName: string,
  heldAtLabel: string,
): { title: string; body: string } {
  const prefix = kind === "day_before" ? "明日の企画リマインド" : "本日の企画リマインド";
  return {
    title: prefix,
    body: `${eventTitle} — ${shopName} / ${heldAtLabel}`,
  };
}

async function sendResendEmail(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend ${response.status}: ${text}`);
  }
}

async function getParticipantEmails(
  supabase: ReturnType<typeof createClient>,
  userIds: string[],
): Promise<Map<string, string>> {
  const emails = new Map<string, string>();

  for (const userId of userIds) {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) {
      throw new Error(`auth lookup failed for ${userId}: ${error.message}`);
    }
    const email = data.user?.email;
    if (email) emails.set(userId, email);
  }

  return emails;
}

async function getAdminEmails(
  supabase: ReturnType<typeof createClient>,
): Promise<string[]> {
  const { data: admins, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  if (error) throw new Error(`admin lookup failed: ${error.message}`);
  if (!admins?.length) return [];

  const emails: string[] = [];
  for (const admin of admins) {
    const { data } = await supabase.auth.admin.getUserById(admin.id);
    if (data.user?.email) emails.push(data.user.email);
  }
  return emails;
}

async function claimReminder(
  supabase: ReturnType<typeof createClient>,
  reminderId: string,
): Promise<boolean> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("reminders")
    .update({ sent_at: now })
    .eq("id", reminderId)
    .is("sent_at", null)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`claim failed: ${error.message}`);
  return Boolean(data);
}

async function processReminder(
  supabase: ReturnType<typeof createClient>,
  reminder: ReminderRow,
  options: {
    communityName: string;
    appUrl: string;
    resendApiKey: string;
    resendFrom: string;
    adminEmails: string[];
  },
): Promise<{ sent: boolean; errors: string[] }> {
  const claimed = await claimReminder(supabase, reminder.id);
  if (!claimed) return { sent: false, errors: [] };

  const errors: string[] = [];

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, held_at, location, deleted_at, shop:shops(name)")
    .eq("id", reminder.event_id)
    .maybeSingle();

  if (eventError) {
    errors.push(`event fetch: ${eventError.message}`);
    return { sent: true, errors };
  }

  const eventRow = event as EventRow | null;
  if (!eventRow || eventRow.deleted_at) {
    errors.push("event not found or deleted");
    return { sent: true, errors };
  }

  const { data: parts, error: partsError } = await supabase
    .from("event_parts")
    .select("id")
    .eq("event_id", reminder.event_id);

  if (partsError || !parts?.length) {
    errors.push(partsError?.message ?? "no event parts");
    return { sent: true, errors };
  }

  const partIds = parts.map((p) => p.id);
  const { data: participations, error: partError } = await supabase
    .from("participations")
    .select("user_id, profiles!inner(nickname)")
    .in("event_part_id", partIds)
    .eq("status", "joined");

  if (partError) {
    errors.push(`participations: ${partError.message}`);
    return { sent: true, errors };
  }

  const participantMap = new Map<string, string>();
  for (const row of participations ?? []) {
    const nickname = (row.profiles as { nickname: string } | null)?.nickname;
    if (nickname) participantMap.set(row.user_id, nickname);
  }

  if (participantMap.size === 0) {
    return { sent: true, errors };
  }

  const kind = reminderKind(reminder.remind_at, eventRow.held_at);
  const shopName = eventRow.shop?.name ?? "店舗未設定";
  const heldAtLabel = formatHeldAtJst(eventRow.held_at);
  const eventUrl = `${options.appUrl.replace(/\/$/, "")}/events/${eventRow.id}`;
  const notif = notificationCopy(kind, eventRow.title, shopName, heldAtLabel);

  const notifications = [...participantMap.entries()].map(([user_id]) => ({
    user_id,
    title: notif.title,
    body: notif.body,
    event_id: eventRow.id,
  }));

  const { error: notifError } = await supabase
    .from("notifications")
    .insert(notifications);

  if (notifError) {
    errors.push(`in_app notifications: ${notifError.message}`);
  }

  let emailsByUser: Map<string, string>;
  try {
    emailsByUser = await getParticipantEmails(
      supabase,
      [...participantMap.keys()],
    );
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
    return { sent: true, errors };
  }

  for (const [userId, nickname] of participantMap) {
    const email = emailsByUser.get(userId);
    if (!email) {
      errors.push(`no email for user ${userId} (${nickname})`);
      continue;
    }

    const emailProps: ReminderEmailProps = {
      communityName: options.communityName,
      nickname,
      eventTitle: eventRow.title,
      shopName,
      heldAtLabel,
      location: eventRow.location,
      eventUrl,
      kind,
    };

    try {
      await sendResendEmail({
        apiKey: options.resendApiKey,
        from: options.resendFrom,
        to: email,
        subject: buildReminderSubject(emailProps),
        html: buildReminderHtml(emailProps),
      });
    } catch (e) {
      errors.push(
        `email to ${nickname}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  if (errors.length > 0 && options.adminEmails.length > 0) {
    try {
      await sendResendEmail({
        apiKey: options.resendApiKey,
        from: options.resendFrom,
        to: options.adminEmails[0],
        subject: `【要確認】リマインド送信失敗 — ${eventRow.title}`,
        html: buildAdminFailureHtml({
          communityName: options.communityName,
          reminderId: reminder.id,
          eventTitle: eventRow.title,
          errors,
        }),
      });
    } catch (e) {
      errors.push(
        `admin alert: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return { sent: true, errors };
}

function authorizeRequest(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const header = req.headers.get("x-cron-secret");
    if (header === cronSecret) return true;
  }

  const auth = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceKey && auth === `Bearer ${serviceKey}`) return true;

  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok");
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405);
  }

  if (!authorizeRequest(req)) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = requireEnv("RESEND_API_KEY");
    const resendFrom = requireEnv("RESEND_FROM_EMAIL");
    const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:3000";

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: settings } = await supabase
      .from("community_settings")
      .select("name")
      .limit(1)
      .maybeSingle();

    const communityName = settings?.name ?? "フーディコミュニティ";
    const adminEmails = await getAdminEmails(supabase);

    const now = new Date().toISOString();
    const { data: dueReminders, error: fetchError } = await supabase
      .from("reminders")
      .select("id, event_id, remind_at, channel")
      .is("sent_at", null)
      .lte("remind_at", now)
      .order("remind_at", { ascending: true });

    if (fetchError) {
      return jsonResponse({ error: fetchError.message }, 500);
    }

    const results: {
      reminder_id: string;
      processed: boolean;
      errors: string[];
    }[] = [];

    for (const reminder of (dueReminders ?? []) as ReminderRow[]) {
      const result = await processReminder(supabase, reminder, {
        communityName,
        appUrl,
        resendApiKey,
        resendFrom,
        adminEmails,
      });
      results.push({
        reminder_id: reminder.id,
        processed: result.sent,
        errors: result.errors,
      });
    }

    return jsonResponse({
      ok: true,
      checked_at: now,
      due_count: dueReminders?.length ?? 0,
      results,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("send-reminders error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
