"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DRAFT_ORIGINS, type DraftOrigin } from "@/lib/draft/constants";
import { fetchOgp } from "@/lib/ogp";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ShopThumb } from "@/components/shops/ShopThumb";

const inputClass =
  "w-full rounded-[var(--radius-input)] border border-line bg-card-2 px-3 py-2 text-sm text-txt outline-none focus:border-brass/50";

const ORIGIN_LABELS: Record<DraftOrigin, string> = {
  stock: "ストック",
  claim: "確保宣言（コネ）",
  free: "フリー検索",
};

type UrlPreview = {
  title: string;
  description: string;
  image: string;
};

export function DraftGenerateForm() {
  const router = useRouter();
  const [shopUrl, setShopUrl] = useState("");
  const [urlPreview, setUrlPreview] = useState<UrlPreview | null>(null);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [origins, setOrigins] = useState<DraftOrigin[]>(["stock", "claim", "free"]);
  const [area, setArea] = useState("");
  const [headcount, setHeadcount] = useState("");
  const [conceptFreeText, setConceptFreeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleOrigin(origin: DraftOrigin) {
    setOrigins((prev) =>
      prev.includes(origin)
        ? prev.filter((o) => o !== origin)
        : [...prev, origin],
    );
  }

  async function handleFetchUrlPreview() {
    if (!shopUrl.trim()) return;
    setError(null);
    setFetchingUrl(true);
    setUrlPreview(null);
    try {
      const supabase = createClient();
      const ogp = await fetchOgp(supabase, shopUrl.trim());
      if (!ogp.title) {
        setError("URL から店情報を取得できませんでした");
        return;
      }
      setUrlPreview({
        title: ogp.title,
        description: ogp.description,
        image: ogp.image,
      });
    } catch {
      setError("URL の取得に失敗しました");
    } finally {
      setFetchingUrl(false);
    }
  }

  async function handleGenerate() {
    setError(null);
    const trimmedUrl = shopUrl.trim();
    if (origins.length === 0 && !trimmedUrl) {
      setError("起点を1つ以上選ぶか、店リンク（URL）を入力してください");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/drafts/generate-concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origins,
          shop_url: trimmedUrl || undefined,
          area: area.trim() || undefined,
          headcount: headcount ? Number(headcount) : undefined,
          concept_free_text: conceptFreeText.trim() || undefined,
        }),
      });

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        if (res.status === 401) {
          setError("セッションが切れました。再ログインしてください。");
          return;
        }
        setError(`サーバーエラー (${res.status})。しばらくして再試行してください。`);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "生成に失敗しました");
        return;
      }

      if (data.needs_shops) {
        setError(data.message);
        return;
      }

      router.push(`/events/drafts/${data.draft_id}`);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle>店リンク（URL）</SectionTitle>
      <p className="text-xs text-txt-muted">
        食べログ・Google Maps 等の URL を貼ると、ページ情報を読み取って企画の起点にします。
      </p>
      <div className="flex gap-2">
        <input
          className={inputClass}
          value={shopUrl}
          onChange={(e) => {
            setShopUrl(e.target.value);
            setUrlPreview(null);
          }}
          placeholder="https://tabelog.com/…"
        />
        <Button
          variant="outline"
          disabled={fetchingUrl || !shopUrl.trim()}
          onClick={handleFetchUrlPreview}
        >
          {fetchingUrl ? "取得中…" : "取得"}
        </Button>
      </div>

      {urlPreview && (
        <Card className="flex gap-3">
          {urlPreview.image ? (
            <img
              src={urlPreview.image}
              alt=""
              className="h-14 w-14 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <ShopThumb
              shop={{
                name: urlPreview.title,
                ogp_image_url: null,
                image_path: null,
              }}
              className="h-14 w-14 shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-heading">
              {urlPreview.title}
            </p>
            {urlPreview.description && (
              <p className="mt-1 line-clamp-2 text-xs text-txt-muted">
                {urlPreview.description}
              </p>
            )}
          </div>
        </Card>
      )}

      <SectionTitle>候補店の起点（任意）</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {DRAFT_ORIGINS.map((origin) => (
          <label
            key={origin}
            className={`cursor-pointer rounded-[var(--radius-btn)] border px-3 py-1.5 text-xs ${
              origins.includes(origin)
                ? "border-brass bg-brass/10 text-brass"
                : "border-line bg-card-2 text-txt-muted"
            }`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={origins.includes(origin)}
              onChange={() => toggleOrigin(origin)}
            />
            {ORIGIN_LABELS[origin]}
          </label>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-xs text-txt-muted">エリア（任意）</label>
        <input
          className={inputClass}
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="銀座、渋谷 など"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-txt-muted">想定人数（任意）</label>
        <input
          type="number"
          min={1}
          max={100}
          className={inputClass}
          value={headcount}
          onChange={(e) => setHeadcount(e.target.value)}
          placeholder="8"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-txt-muted">
          追加条件（任意）
        </label>
        <textarea
          className={`${inputClass} min-h-20 resize-y`}
          value={conceptFreeText}
          onChange={(e) => setConceptFreeText(e.target.value)}
          placeholder="高難度店の制覇、少人数で深い体験 など"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button className="w-full" disabled={loading || fetchingUrl} onClick={handleGenerate}>
        {loading ? "コンセプト生成中…" : "コンセプトを生成"}
      </Button>
    </div>
  );
}
