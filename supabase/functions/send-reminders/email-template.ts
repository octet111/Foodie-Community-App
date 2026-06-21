/** リマインドメール HTML（DB テンプレート対応） */

export const ADVANCE_REMINDER_DAYS = 4;

export type ReminderKind = "advance" | "day_of";

export type ReminderEmailProps = {
  communityName: string;
  nickname: string;
  eventTitle: string;
  shopName: string;
  heldAtLabel: string;
  location: string | null;
  eventUrl: string;
  kind: ReminderKind;
};

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildLocationBlockHtml(location: string | null): string {
  if (!location?.trim()) return "";
  return `<tr><td style="padding:8px 0;color:#666;font-size:13px;">場所</td><td style="padding:8px 0;color:#1a1a1a;font-size:14px;">${escapeHtml(location.trim())}</td></tr>`;
}

export function buildReminderEmailVars(
  props: ReminderEmailProps,
): ReminderEmailVars {
  const headline =
    props.kind === "advance"
      ? `${ADVANCE_REMINDER_DAYS}日前の企画リマインド`
      : "本日の企画リマインド";
  const lead =
    props.kind === "advance"
      ? `参加表明済みの企画が${ADVANCE_REMINDER_DAYS}日後に開催されます。`
      : "参加表明済みの企画が本日開催されます。";

  return {
    community_name: props.communityName,
    nickname: props.nickname,
    event_title: props.eventTitle,
    shop_name: props.shopName,
    held_at: props.heldAtLabel,
    location: props.location?.trim() ?? "",
    location_block: buildLocationBlockHtml(props.location),
    event_url: props.eventUrl,
    headline,
    lead,
    subject_prefix:
      props.kind === "advance"
        ? `【${ADVANCE_REMINDER_DAYS}日前】`
        : "【本日】",
  };
}

function renderTemplate(template: string, vars: ReminderEmailVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key as keyof ReminderEmailVars];
    return value ?? "";
  });
}

export function buildReminderSubject(
  props: ReminderEmailProps,
  subjectTemplate?: string | null,
): string {
  const vars = buildReminderEmailVars(props);
  const template = subjectTemplate?.trim() || DEFAULT_EMAIL_SUBJECT_TEMPLATE;
  return renderTemplate(template, vars);
}

export function buildReminderHtml(
  props: ReminderEmailProps,
  bodyTemplate?: string | null,
): string {
  const vars = buildReminderEmailVars(props);
  const template = bodyTemplate?.trim() || DEFAULT_EMAIL_BODY_TEMPLATE;
  return renderTemplate(template, vars);
}

export function buildAdminFailureHtml(details: {
  communityName: string;
  reminderId: string;
  eventTitle: string;
  errors: string[];
}): string {
  const e = escapeHtml;
  const list = details.errors.map((err) => `<li>${e(err)}</li>`).join("");

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;padding:16px;">
  <h2 style="color:#c0392b;">リマインド送信失敗</h2>
  <p>コミュニティ: ${e(details.communityName)}</p>
  <p>企画: ${e(details.eventTitle)}</p>
  <p>リマインドID: ${e(details.reminderId)}</p>
  <ul>${list}</ul>
  <p style="color:#666;font-size:12px;">自動リトライは行いません。必要に応じて手動で参加者へ連絡してください。</p>
</body>
</html>`;
}
