import { describe, expect, it } from "vitest";
import {
  ADVANCE_REMINDER_DAYS,
  DEFAULT_EMAIL_SUBJECT_TEMPLATE,
  REMINDER_EMAIL_PREVIEW_VARS,
  buildReminderHtml,
  buildReminderSubject,
  parseTimeInput,
  renderReminderTemplate,
} from "@/lib/reminder-templates";

describe("renderReminderTemplate", () => {
  it("プレースホルダーを差し替える", () => {
    expect(
      renderReminderTemplate("{{nickname}} さん — {{event_title}}", {
        ...REMINDER_EMAIL_PREVIEW_VARS,
        nickname: "まり",
        event_title: "テスト企画",
      }),
    ).toBe("まり さん — テスト企画");
  });
});

describe("buildReminderSubject", () => {
  it("デフォルト件名テンプレートで件名を生成する", () => {
    expect(
      buildReminderSubject(null, REMINDER_EMAIL_PREVIEW_VARS),
    ).toBe(`【${ADVANCE_REMINDER_DAYS}日前】鮨かね田を貸切る会 — 美食倶楽部`);
  });

  it("カスタム件名テンプレートを使える", () => {
    expect(
      buildReminderSubject(
        "{{community_name}}：{{event_title}}",
        REMINDER_EMAIL_PREVIEW_VARS,
      ),
    ).toBe("美食倶楽部：鮨かね田を貸切る会");
  });
});

describe("buildReminderHtml", () => {
  it("本文 HTML に変数が埋め込まれる", () => {
    const html = buildReminderHtml(null, REMINDER_EMAIL_PREVIEW_VARS);
    expect(html).toContain("鮨かね田を貸切る会");
    expect(html).toContain("企画詳細を見る");
  });
});

describe("parseTimeInput", () => {
  it("HH:MM を DB 用 time に変換する", () => {
    expect(parseTimeInput("18:00")).toBe("18:00:00");
    expect(parseTimeInput("9:05")).toBe("09:05:00");
  });

  it("不正な時刻は null", () => {
    expect(parseTimeInput("25:00")).toBeNull();
    expect(parseTimeInput("abc")).toBeNull();
  });
});

describe("defaults", () => {
  it("デフォルト件名に主要プレースホルダーが含まれる", () => {
    expect(DEFAULT_EMAIL_SUBJECT_TEMPLATE).toContain("{{subject_prefix}}");
    expect(DEFAULT_EMAIL_SUBJECT_TEMPLATE).toContain("{{event_title}}");
  });
});
