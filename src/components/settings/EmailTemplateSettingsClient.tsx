"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { CommunitySettingsFull } from "@/lib/settings-data";
import {
  DEFAULT_EMAIL_BODY_TEMPLATE,
  DEFAULT_EMAIL_SUBJECT_TEMPLATE,
  REMINDER_EMAIL_PREVIEW_VARS,
  REMINDER_TEMPLATE_PLACEHOLDERS,
  buildReminderHtml,
  buildReminderSubject,
} from "@/lib/reminder-templates";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SettingsSubNav } from "@/components/settings/SettingsSubNav";

type EmailTemplateSettingsClientProps = {
  settings: CommunitySettingsFull;
};

const textareaClass =
  "w-full rounded-[var(--radius-input)] border border-line bg-card-2 px-3 py-2 font-mono text-xs text-txt outline-none focus:border-brass/50";

export function EmailTemplateSettingsClient({
  settings,
}: EmailTemplateSettingsClientProps) {
  const router = useRouter();
  const [subjectTemplate, setSubjectTemplate] = useState(
    settings.emailReminderSubjectTemplate,
  );
  const [bodyTemplate, setBodyTemplate] = useState(
    settings.emailReminderBodyTemplate,
  );
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const previewSubject = useMemo(
    () => buildReminderSubject(subjectTemplate, REMINDER_EMAIL_PREVIEW_VARS),
    [subjectTemplate],
  );

  const previewHtml = useMemo(
    () => buildReminderHtml(bodyTemplate, REMINDER_EMAIL_PREVIEW_VARS),
    [bodyTemplate],
  );

  async function handleSave() {
    if (!subjectTemplate.trim() || !bodyTemplate.trim()) {
      setError("件名・本文テンプレートを入力してください。");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const payload = {
      email_reminder_subject_template: subjectTemplate.trim(),
      email_reminder_body_template: bodyTemplate.trim(),
      updated_at: new Date().toISOString(),
    };

    let saveError: { message: string } | null = null;

    if (settings.id) {
      const { error: updateError } = await supabase
        .from("community_settings")
        .update(payload)
        .eq("id", settings.id);
      saveError = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("community_settings")
        .insert({
          name: settings.name,
          ...payload,
        });
      saveError = insertError;
    }

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setSuccess("メールテンプレートを保存しました。");
    router.refresh();
  }

  function handleReset() {
    setSubjectTemplate(DEFAULT_EMAIL_SUBJECT_TEMPLATE);
    setBodyTemplate(DEFAULT_EMAIL_BODY_TEMPLATE);
    setError(null);
    setSuccess(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <SettingsSubNav />
      <SectionTitle>メールテンプレート</SectionTitle>

      {error && (
        <p className="text-sm text-shu" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-[var(--color-green)]" role="status">
          {success}
        </p>
      )}

      <Card className="flex flex-col gap-3">
        <p className="text-xs leading-relaxed text-txt-muted">
          リマインドメールの件名・本文 HTML テンプレートです。{" "}
          <code className="text-[10px] text-brass">{`{{変数名}}`}</code>{" "}
          で差し込みできます。
        </p>
        <ul className="grid gap-1 text-[10px] text-txt-muted sm:grid-cols-2">
          {REMINDER_TEMPLATE_PLACEHOLDERS.map((item) => (
            <li key={item.key}>
              <code className="text-brass">{`{{${item.key}}}`}</code>
              {" — "}
              {item.description}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-txt-2">件名テンプレート</span>
          <input
            type="text"
            className={textareaClass.replace("font-mono text-xs", "text-sm")}
            value={subjectTemplate}
            onChange={(e) => setSubjectTemplate(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-txt-2">本文 HTML テンプレート</span>
          <textarea
            className={`${textareaClass} min-h-[280px] resize-y`}
            value={bodyTemplate}
            onChange={(e) => setBodyTemplate(e.target.value)}
            spellCheck={false}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "保存中…" : "保存"}
          </Button>
          <Button variant="outline" disabled={saving} onClick={handleReset}>
            初期値に戻す
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? "プレビューを閉じる" : "プレビュー"}
          </Button>
        </div>
      </Card>

      {showPreview && (
        <Card className="flex flex-col gap-3">
          <SectionTitle>プレビュー（4日前リマインド想定）</SectionTitle>
          <p className="text-xs text-txt-muted">
            件名: <span className="text-txt">{previewSubject}</span>
          </p>
          <div className="overflow-hidden rounded-md border border-line bg-white">
            <iframe
              title="メールプレビュー"
              srcDoc={previewHtml}
              className="h-[420px] w-full"
              sandbox=""
            />
          </div>
        </Card>
      )}
    </div>
  );
}
