export const ADVANCE_REMINDER_DAYS = 4;

export type ReminderKind = "advance" | "day_of";

export type ReminderEmailVars = {
  community_name: string;
  nickname: string;
  event_title: string;
  shop_name: string;
  held_at: string;
  location: string;
  location_block: string;
  event_url: string;
  headline: string;
  lead: string;
  subject_prefix: string;
};

export const REMINDER_TEMPLATE_PLACEHOLDERS: {
  key: keyof ReminderEmailVars;
  description: string;
}[] = [
  { key: "subject_prefix", description: "件名用プレフィックス（【4日前】/【本日】）" },
  { key: "community_name", description: "コミュニティ名" },
  { key: "nickname", description: "宛先ニックネーム" },
  { key: "event_title", description: "企画タイトル" },
  { key: "shop_name", description: "店名" },
  { key: "held_at", description: "開催日時（表示用）" },
  { key: "location", description: "場所（テキスト）" },
  { key: "location_block", description: "場所行 HTML（未設定時は空）" },
  { key: "event_url", description: "企画詳細 URL" },
  { key: "headline", description: "メール見出し" },
  { key: "lead", description: "リード文" },
];

export const DEFAULT_REMINDER_DAY_BEFORE_TIME = "18:00";
export const DEFAULT_REMINDER_DAY_OF_TIME = "09:00";

export const DEFAULT_EMAIL_SUBJECT_TEMPLATE =
  "{{subject_prefix}}{{event_title}} — {{community_name}}";

export const DEFAULT_EMAIL_BODY_TEMPLATE = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Helvetica Neue',Arial,'Hiragino Kaku Gothic ProN',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f0e8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fff;border:1px solid #c9a84c;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#1a1a1a;padding:20px 24px;">
          <p style="margin:0;font-size:11px;letter-spacing:0.12em;color:#c9a84c;text-transform:uppercase;">{{community_name}}</p>
          <h1 style="margin:8px 0 0;font-size:20px;font-weight:600;color:#f5f0e8;">{{headline}}</h1>
        </td></tr>
        <tr><td style="padding:24px;">
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#333;">{{nickname}} さん、{{lead}}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e8e0d0;border-bottom:1px solid #e8e0d0;margin:16px 0;">
            <tr><td style="padding:12px 0;font-size:18px;font-weight:600;color:#1a1a1a;">{{event_title}}</td></tr>
            <tr><td style="padding:0 0 8px;font-size:14px;color:#666;">{{shop_name}}</td></tr>
            <tr><td style="padding:8px 0;font-size:15px;color:#1a1a1a;">{{held_at}}</td></tr>
            {{location_block}}
          </table>
          <p style="margin:20px 0 0;text-align:center;">
            <a href="{{event_url}}" style="display:inline-block;padding:12px 28px;background:#c0392b;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">企画詳細を見る</a>
          </p>
        </td></tr>
        <tr><td style="padding:16px 24px;background:#faf7f2;border-top:1px solid #e8e0d0;">
          <p style="margin:0;font-size:11px;color:#888;line-height:1.5;">このメールは {{community_name}} の企画リマインドです。参加表明を取り消した場合は無視してください。</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

export function renderReminderTemplate(
  template: string,
  vars: ReminderEmailVars,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key as keyof ReminderEmailVars];
    return value ?? "";
  });
}

export function buildLocationBlockHtml(location: string | null): string {
  if (!location?.trim()) return "";
  return `<tr><td style="padding:8px 0;color:#666;font-size:13px;">場所</td><td style="padding:8px 0;color:#1a1a1a;font-size:14px;">${escapeHtml(location.trim())}</td></tr>`;
}

export function buildReminderEmailVars(params: {
  communityName: string;
  nickname: string;
  eventTitle: string;
  shopName: string;
  heldAtLabel: string;
  location: string | null;
  eventUrl: string;
  kind: ReminderKind;
}): ReminderEmailVars {
  const headline =
    params.kind === "advance"
      ? `${ADVANCE_REMINDER_DAYS}日前の企画リマインド`
      : "本日の企画リマインド";
  const lead =
    params.kind === "advance"
      ? `参加表明済みの企画が${ADVANCE_REMINDER_DAYS}日後に開催されます。`
      : "参加表明済みの企画が本日開催されます。";

  return {
    community_name: params.communityName,
    nickname: params.nickname,
    event_title: params.eventTitle,
    shop_name: params.shopName,
    held_at: params.heldAtLabel,
    location: params.location?.trim() ?? "",
    location_block: buildLocationBlockHtml(params.location),
    event_url: params.eventUrl,
    headline,
    lead,
    subject_prefix: params.kind === "advance" ? `【${ADVANCE_REMINDER_DAYS}日前】` : "【本日】",
  };
}

export function buildReminderSubject(
  subjectTemplate: string | null | undefined,
  vars: ReminderEmailVars,
): string {
  const template = subjectTemplate?.trim() || DEFAULT_EMAIL_SUBJECT_TEMPLATE;
  return renderReminderTemplate(template, vars);
}

export function buildReminderHtml(
  bodyTemplate: string | null | undefined,
  vars: ReminderEmailVars,
): string {
  const template = bodyTemplate?.trim() || DEFAULT_EMAIL_BODY_TEMPLATE;
  return renderReminderTemplate(template, vars);
}

export function parseTimeInput(value: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

export function formatTimeForInput(dbTime: string | null): string {
  if (!dbTime) return DEFAULT_REMINDER_DAY_BEFORE_TIME;
  const match = /^(\d{1,2}):(\d{2})/.exec(dbTime);
  if (!match) return DEFAULT_REMINDER_DAY_BEFORE_TIME;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const REMINDER_EMAIL_PREVIEW_VARS: ReminderEmailVars = {
  community_name: "美食倶楽部",
  nickname: "たく",
  event_title: "鮨かね田を貸切る会",
  shop_name: "鮨かね田",
  held_at: "6/27（土）18:00",
  location: "銀座",
  location_block: buildLocationBlockHtml("銀座"),
  event_url: "https://example.com/events/preview",
  headline: `${ADVANCE_REMINDER_DAYS}日前の企画リマインド`,
  lead: `参加表明済みの企画が${ADVANCE_REMINDER_DAYS}日後に開催されます。`,
  subject_prefix: `【${ADVANCE_REMINDER_DAYS}日前】`,
};
