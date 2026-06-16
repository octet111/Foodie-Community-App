"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ShopRarity } from "@/lib/constants";
import { SHOP_RARITY_OPTIONS } from "@/lib/constants";
import { fetchOgp } from "@/lib/ogp";
import {
  formatStorageUploadError,
  MAX_IMAGE_UPLOAD_LABEL,
  uploadShopImage,
  validateImageFileSize,
} from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ShopThumb } from "@/components/shops/ShopThumb";

type ShopAddModalProps = {
  open: boolean;
  onClose: () => void;
  userId: string;
};

const inputClass =
  "w-full rounded-[var(--radius-input)] border border-line bg-card-2 px-3 py-2 text-sm text-txt outline-none focus:border-brass/50";

export function ShopAddModal({ open, onClose, userId }: ShopAddModalProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [ogpImageUrl, setOgpImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [rarity, setRarity] = useState<ShopRarity>("reservable");
  const [manualMode, setManualMode] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [previewReady, setPreviewReady] = useState(false);

  function resetForm() {
    setUrl("");
    setName("");
    setArea("");
    setDescription("");
    setOgpImageUrl("");
    setImageFile(null);
    setRarity("reservable");
    setManualMode(false);
    setPreviewReady(false);
    setError(null);
    setInfo(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleFetchOgp() {
    if (!url.trim()) return;
    setError(null);
    setInfo(null);
    setFetching(true);

    const supabase = createClient();
    const ogp = await fetchOgp(supabase, url.trim());

    setFetching(false);

    if (ogp.title || ogp.image) {
      setName(ogp.title);
      setDescription(ogp.description);
      setOgpImageUrl(ogp.image);
      setManualMode(!ogp.image);
      setPreviewReady(true);
      if (!ogp.image) {
        setInfo(
          "店名のみ取得できました。画像は手動アップロードできます（Google Maps 等は画像が取得できない場合があります）。",
        );
      }
      return;
    }

    setManualMode(true);
    setPreviewReady(true);
    setInfo(null);
    setError(
      "OGPを取得できませんでした。店名を手動入力するか、画像をアップロードしてください。",
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("店名を入力してください。");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      let imagePath: string | null = null;

      if (imageFile) {
        imagePath = await uploadShopImage(supabase, userId, imageFile);
      }

      const { data: shop, error: shopError } = await supabase
        .from("shops")
        .insert({
          name: name.trim(),
          url: url.trim() || null,
          area: area.trim() || null,
          ogp_image_url: ogpImageUrl || null,
          ogp_description: description.trim() || null,
          image_path: imagePath,
          rarity,
          created_by: userId,
        })
        .select("id")
        .single();

      if (shopError) throw shopError;

      const { error: stockError } = await supabase.from("stocks").insert({
        shop_id: shop.id,
        user_id: userId,
      });

      if (stockError && stockError.code !== "23505") throw stockError;

      handleClose();
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? formatStorageUploadError(e) : "保存に失敗しました。",
      );
    } finally {
      setSaving(false);
    }
  }

  const previewShop = {
    name: name || "プレビュー",
    ogp_image_url: ogpImageUrl || null,
    image_path: null as string | null,
  };

  return (
    <Modal open={open} onClose={handleClose} title="店を追加">
      <div className="flex flex-col gap-4">
        {!previewReady ? (
          <>
            <div>
              <label htmlFor="shop-url" className="mb-1 block text-xs text-txt-2">
                店のURL（食べログ・Google Maps 等）
              </label>
              <input
                id="shop-url"
                type="url"
                className={inputClass}
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              disabled={!url.trim() || fetching}
              onClick={handleFetchOgp}
            >
              {fetching ? "取得中…" : "OGPを取得"}
            </Button>
            <button
              type="button"
              className="text-center text-xs text-txt-muted underline"
              onClick={() => {
                setManualMode(true);
                setPreviewReady(true);
              }}
            >
              URLなしで手動入力
            </button>
          </>
        ) : (
          <>
            {(ogpImageUrl || imageFile) && !manualMode && (
              <ShopThumb shop={previewShop} className="h-32 w-full" />
            )}
            {manualMode && (
              <div>
                <label htmlFor="shop-image" className="mb-1 block text-xs text-txt-2">
                  店画像（任意・{MAX_IMAGE_UPLOAD_LABEL}以下）
                </label>
                <input
                  id="shop-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
                  className="w-full text-xs text-txt-2"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (!file) {
                      setImageFile(null);
                      return;
                    }
                    try {
                      validateImageFileSize(file);
                      setImageFile(file);
                      setError(null);
                    } catch (err) {
                      setImageFile(null);
                      e.target.value = "";
                      setError(
                        err instanceof Error
                          ? err.message
                          : "画像を選択できませんでした。",
                      );
                    }
                  }}
                />
              </div>
            )}
            <div>
              <label htmlFor="shop-name" className="mb-1 block text-xs text-txt-2">
                店名
              </label>
              <input
                id="shop-name"
                type="text"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="shop-area" className="mb-1 block text-xs text-txt-2">
                エリア（任意）
              </label>
              <input
                id="shop-area"
                type="text"
                className={inputClass}
                placeholder="銀座・鮨"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="shop-rarity" className="mb-1 block text-xs text-txt-2">
                予約難易度
              </label>
              <select
                id="shop-rarity"
                className={inputClass}
                value={rarity}
                onChange={(e) => setRarity(e.target.value as ShopRarity)}
              >
                {SHOP_RARITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {info && (
          <p className="text-sm text-txt-2" role="status">
            {info}
          </p>
        )}
        {error && (
          <p className="text-sm text-shu" role="alert">
            {error}
          </p>
        )}

        {previewReady && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={saving}
              onClick={() => {
                setPreviewReady(false);
                setManualMode(false);
              }}
            >
              戻る
            </Button>
            <Button
              className="flex-1"
              disabled={saving || !name.trim()}
              onClick={handleSave}
            >
              {saving ? "保存中…" : "保存"}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
