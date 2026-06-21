"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CommunitySettingsFull } from "@/lib/settings-data";
import {
  DEFAULT_REMINDER_DAY_BEFORE_TIME,
  DEFAULT_REMINDER_DAY_OF_TIME,
  parseTimeInput,
} from "@/lib/reminder-templates";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SettingsSubNav } from "@/components/settings/SettingsSubNav";

type ReminderSettingsClientProps = {
  settings: CommunitySettingsFull;
};

export function ReminderSettingsClient({
  settings,
}: ReminderSettingsClientProps) {
  const router = useRouter();
  const [dayBeforeTime, setDayBeforeTime] = useState(
    settings.reminderDayBeforeTime,
  );
  const [dayOfTime, setDayOfTime] = useState(settings.reminderDayOfTime);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave() {
    const before = parseTimeInput(dayBeforeTime);
    const dayOf = parseTimeInput(dayOfTime);

    if (!before || !dayOf) {
      setError("時刻の形式が正しくありません（HH:MM）。");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const payload = {
      reminder_day_before_time: before,
      reminder_day_of_time: dayOf,
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

    setSuccess("リマインド設定を保存しました。新規公開する企画から反映されます。");
    router.refresh();
  }

  function handleReset() {
    setDayBeforeTime(DEFAULT_REMINDER_DAY_BEFORE_TIME);
    setDayOfTime(DEFAULT_REMINDER_DAY_OF_TIME);
    setError(null);
    setSuccess(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <SettingsSubNav />
      <SectionTitle>リマインドのデフォルト設定</SectionTitle>

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

      <Card className="flex flex-col gap-4">
        <p className="text-xs leading-relaxed text-txt-muted">
          企画公開時に自動生成されるリマインド（4日前・当日）の送信時刻です。日本時間（JST）で設定してください。既存企画のリマインドは変更されません。
        </p>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-txt-2">4日前リマインド</span>
          <input
            type="time"
            className="w-full rounded-[var(--radius-input)] border border-line bg-card-2 px-3 py-2 text-sm text-txt outline-none focus:border-brass/50"
            value={dayBeforeTime}
            onChange={(e) => setDayBeforeTime(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-txt-2">当日リマインド</span>
          <input
            type="time"
            className="w-full rounded-[var(--radius-input)] border border-line bg-card-2 px-3 py-2 text-sm text-txt outline-none focus:border-brass/50"
            value={dayOfTime}
            onChange={(e) => setDayOfTime(e.target.value)}
          />
        </label>

        <div className="flex gap-2">
          <Button
            variant="primary"
            className="flex-1"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "保存中…" : "保存"}
          </Button>
          <Button variant="outline" disabled={saving} onClick={handleReset}>
            初期値に戻す
          </Button>
        </div>
      </Card>
    </div>
  );
}
