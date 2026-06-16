"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EventDetail } from "@/lib/events-data";
import { isoToLocalDatetime, localDatetimeToIso } from "@/lib/event-dates";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ShopThumb } from "@/components/shops/ShopThumb";
import {
  EventPartEditor,
  partsToInsert,
  validateParts,
  type PartDraft,
} from "@/components/events/EventPartEditor";

const inputClass =
  "w-full rounded-[var(--radius-input)] border border-line bg-card-2 px-3 py-2 text-sm text-txt outline-none focus:border-brass/50";

type EventEditFormProps = {
  event: EventDetail;
};

export function EventEditForm({ event }: EventEditFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [heldAt, setHeldAt] = useState(isoToLocalDatetime(event.held_at));
  const [location, setLocation] = useState(event.location ?? "");
  const [parts, setParts] = useState<PartDraft[]>(
    event.parts.map((p) => ({
      key: p.id,
      name: p.name,
      capacity: String(p.capacity),
      fee_estimate: String(p.fee_estimate),
    })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasParticipations = event.participations.length > 0;

  async function handleSave() {
    setError(null);
    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    if (!heldAt) {
      setError("開催日時を入力してください");
      return;
    }
    const partError = validateParts(parts);
    if (partError) {
      setError(partError);
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("events")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        held_at: localDatetimeToIso(heldAt),
        location: location.trim() || null,
      })
      .eq("id", event.id);

    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    if (!hasParticipations) {
      await supabase.from("event_parts").delete().eq("event_id", event.id);
      const rows = partsToInsert(parts).map((p) => ({
        ...p,
        event_id: event.id,
      }));
      const { error: partsError } = await supabase
        .from("event_parts")
        .insert(rows);
      if (partsError) {
        setSaving(false);
        setError(partsError.message);
        return;
      }
    } else {
      for (const draft of parts) {
        const existing = event.parts.find((p) => p.id === draft.key);
        if (existing) {
          await supabase
            .from("event_parts")
            .update({
              name: draft.name.trim(),
              capacity: Number(draft.capacity),
              fee_estimate: Number(draft.fee_estimate),
            })
            .eq("id", existing.id);
        }
      }
      const newDrafts = parts.filter(
        (d) => !event.parts.some((p) => p.id === d.key),
      );
      if (newDrafts.length > 0) {
        const maxOrder = Math.max(...event.parts.map((p) => p.sort_order), 0);
        const rows = partsToInsert(newDrafts).map((p, i) => ({
          ...p,
          sort_order: maxOrder + i + 1,
          event_id: event.id,
        }));
        await supabase.from("event_parts").insert(rows);
      }
    }

    setSaving(false);
    router.push(`/events/${event.id}`);
    router.refresh();
  }

  return (
    <>
      <Card className="flex items-center gap-3">
        <ShopThumb shop={event.shop} className="h-14 w-14 shrink-0" />
        <p className="font-display text-sm font-semibold text-heading">
          {event.shop.name}
        </p>
      </Card>

      <div>
        <label className="mb-1 block text-xs text-txt-muted">タイトル</label>
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-txt-muted">企画説明</label>
        <textarea
          className={`${inputClass} min-h-24 resize-y`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-txt-muted">開催日時</label>
          <input
            type="datetime-local"
            className={inputClass}
            value={heldAt}
            onChange={(e) => setHeldAt(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-txt-muted">場所</label>
          <input
            className={inputClass}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      </div>

      <SectionTitle>参加パート</SectionTitle>
      {hasParticipations && (
        <p className="text-xs text-txt-muted">
          参加者がいるため、既存パートの削除はできません。定員・費用・名前の変更と追加のみ可能です。
        </p>
      )}
      <EventPartEditor
        parts={parts}
        onChange={(next) => {
          if (hasParticipations && next.length < parts.length) {
            setError("参加者がいるパートは削除できません");
            return;
          }
          setParts(next);
        }}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button className="w-full" disabled={saving} onClick={handleSave}>
        {saving ? "保存中…" : "変更を保存"}
      </Button>
    </>
  );
}
