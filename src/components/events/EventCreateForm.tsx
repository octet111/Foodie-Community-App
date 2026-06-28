"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AppProfile } from "@/lib/app-data";
import {
  combineLocalDatetime,
  isoToHeldAtFields,
  localDatetimeToIso,
} from "@/lib/event-dates";
import { EventHeldAtFields } from "@/components/events/EventHeldAtFields";
import { fetchOgp } from "@/lib/ogp";
import type { Shop, ShopClaimGroup, StockItem } from "@/lib/shops-data";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ShopAddModal } from "@/components/shops/ShopAddModal";
import { ShopThumb } from "@/components/shops/ShopThumb";
import {
  EventPartEditor,
  createDefaultPart,
  partsToInsert,
  validateParts,
  type PartDraft,
} from "@/components/events/EventPartEditor";
import { ShopPickerModal } from "@/components/events/ShopPickerModal";

const inputClass =
  "w-full rounded-[var(--radius-input)] border border-line bg-card-2 px-3 py-2 text-sm text-txt outline-none focus:border-brass/50";

type EventCreateFormProps = {
  profile: AppProfile;
  stocks: StockItem[];
  publicStocks: StockItem[];
  claimGroups: ShopClaimGroup[];
  initialShop: Shop | null;
};

type PickerTab = "stocks" | "claims";

export function EventCreateForm({
  profile,
  stocks,
  publicStocks,
  claimGroups,
  initialShop,
}: EventCreateFormProps) {
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(initialShop);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<PickerTab>("stocks");
  const [addShopOpen, setAddShopOpen] = useState(false);
  const [shopUrl, setShopUrl] = useState("");
  const [fetchingShop, setFetchingShop] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [heldDate, setHeldDate] = useState("");
  const [heldTime, setHeldTime] = useState(
    () => isoToHeldAtFields(new Date().toISOString()).time,
  );
  const [location, setLocation] = useState("");
  const [parts, setParts] = useState<PartDraft[]>([createDefaultPart()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFetchShopFromUrl() {
    if (!shopUrl.trim()) return;
    setError(null);
    setFetchingShop(true);
    const supabase = createClient();
    const ogp = await fetchOgp(supabase, shopUrl.trim());
    setFetchingShop(false);

    if (!ogp.title) {
      setError("店情報を取得できませんでした。店リストから選ぶか手動で店を追加してください。");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("shops")
      .insert({
        name: ogp.title,
        area: null,
        url: shopUrl.trim(),
        ogp_description: ogp.description || null,
        ogp_image_url: ogp.image || null,
        created_by: profile.id,
      })
      .select("*")
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "店の保存に失敗しました");
      return;
    }

    setShop(data);
    if (!location && ogp.description) setLocation("");
  }

  async function handlePublish() {
    setError(null);

    if (!shop) {
      setError("店を選択してください");
      return;
    }
    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    if (!heldDate || !heldTime) {
      setError("開催日時を入力してください");
      return;
    }
    const heldAt = combineLocalDatetime(heldDate, heldTime);
    const partError = validateParts(parts);
    if (partError) {
      setError(partError);
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        shop_id: shop.id,
        organizer_id: profile.id,
        title: title.trim(),
        description: description.trim() || null,
        held_at: localDatetimeToIso(heldAt),
        location: location.trim() || null,
        status: "open",
      })
      .select("id")
      .single();

    if (eventError || !event) {
      setSaving(false);
      setError(eventError?.message ?? "企画の保存に失敗しました");
      return;
    }

    const partRows = partsToInsert(parts).map((p) => ({
      ...p,
      event_id: event.id,
    }));

    const { error: partsError } = await supabase
      .from("event_parts")
      .insert(partRows);

    if (partsError) {
      setSaving(false);
      setError(partsError.message);
      return;
    }

    const { error: reminderError } = await supabase.rpc(
      "create_event_reminders",
      { p_event_id: event.id },
    );

    if (reminderError) {
      setSaving(false);
      setError(reminderError.message);
      return;
    }

    setSaving(false);
    router.push(`/events/${event.id}`);
    router.refresh();
  }

  return (
    <>
      <SectionTitle>店</SectionTitle>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            setPickerTab("stocks");
            setPickerOpen(true);
          }}
        >
          ストックから選ぶ
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            setPickerTab("claims");
            setPickerOpen(true);
          }}
        >
          確保宣言から選ぶ
        </Button>
      </div>

      <div>
        <label className="mb-1 block text-xs text-txt-muted">
          店リンク（URL貼付で情報を自動取得）
        </label>
        <div className="flex gap-2">
          <input
            className={inputClass}
            value={shopUrl}
            onChange={(e) => setShopUrl(e.target.value)}
            placeholder="https://tabelog.com/…"
          />
          <Button
            variant="outline"
            disabled={fetchingShop || !shopUrl.trim()}
            onClick={handleFetchShopFromUrl}
          >
            {fetchingShop ? "取得中…" : "取得"}
          </Button>
        </div>
      </div>

      <Button variant="outline" className="w-full" onClick={() => setAddShopOpen(true)}>
        手動で店を追加
      </Button>

      {shop && (
        <Card className="flex items-center gap-3">
          <ShopThumb shop={shop} className="h-14 w-14 shrink-0" />
          <div>
            <p className="font-display text-sm font-semibold text-heading">
              {shop.name}
            </p>
            <p className="text-xs text-txt-muted">
              {shop.area ?? "エリア未設定"}・選択済 ✓
            </p>
          </div>
        </Card>
      )}

      <div>
        <label className="mb-1 block text-xs text-txt-muted">タイトル</label>
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="鮨かね田を貸切る会"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-txt-muted">企画説明</label>
        <textarea
          className={`${inputClass} min-h-24 resize-y`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="企画の説明（改行可）"
        />
      </div>

      <EventHeldAtFields
        date={heldDate}
        time={heldTime}
        onDateChange={setHeldDate}
        onTimeChange={setHeldTime}
      />

      <div>
        <label htmlFor="event-location" className="mb-1 block text-xs text-txt-muted">
          場所
        </label>
        <input
          id="event-location"
          className={inputClass}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="銀座"
        />
      </div>

      <SectionTitle>参加パート</SectionTitle>
      <EventPartEditor parts={parts} onChange={setParts} />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button
        className="w-full"
        disabled={saving}
        onClick={handlePublish}
      >
        {saving ? "公開中…" : "この内容で公開する"}
      </Button>

      <ShopPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        initialTab={pickerTab}
        stocks={stocks}
        publicStocks={publicStocks}
        isAdmin={profile.role === "admin"}
        claimGroups={claimGroups}
        onSelect={setShop}
      />

      <ShopAddModal
        open={addShopOpen}
        onClose={() => setAddShopOpen(false)}
        userId={profile.id}
      />
    </>
  );
}
