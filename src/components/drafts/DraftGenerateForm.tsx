"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DRAFT_ORIGINS, type DraftOrigin } from "@/lib/draft/constants";
import { Button } from "@/components/ui/Button";
import { SectionTitle } from "@/components/ui/SectionTitle";

const inputClass =
  "w-full rounded-[var(--radius-input)] border border-line bg-card-2 px-3 py-2 text-sm text-txt outline-none focus:border-brass/50";

const ORIGIN_LABELS: Record<DraftOrigin, string> = {
  stock: "ストック",
  claim: "確保宣言（コネ）",
  free: "フリー検索",
};

export function DraftGenerateForm() {
  const router = useRouter();
  const [origins, setOrigins] = useState<DraftOrigin[]>(["stock", "claim"]);
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

  async function handleGenerate() {
    setError(null);
    if (origins.length === 0) {
      setError("起点を1つ以上選択してください");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/drafts/generate-concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origins,
          area: area.trim() || undefined,
          headcount: headcount ? Number(headcount) : undefined,
          concept_free_text: conceptFreeText.trim() || undefined,
        }),
      });

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
      <SectionTitle>候補店の起点</SectionTitle>
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

      <Button className="w-full" disabled={loading} onClick={handleGenerate}>
        {loading ? "コンセプト生成中…" : "コンセプトを生成"}
      </Button>
    </div>
  );
}
