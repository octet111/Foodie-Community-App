"use client";

import { useState } from "react";
import type { ConceptOption } from "@/lib/draft/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";

const inputClass =
  "w-full rounded-[var(--radius-input)] border border-line bg-card-2 px-3 py-2 text-sm text-txt outline-none focus:border-brass/50";

type DraftConceptSelectProps = {
  draftId: string;
  conceptOptions: ConceptOption[];
  onGenerated: () => void;
};

export function DraftConceptSelect({
  draftId,
  conceptOptions,
  onGenerated,
}: DraftConceptSelectProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState("");
  const [customRationale, setCustomRationale] = useState("");
  const [customTone, setCustomTone] = useState("casual");

  async function selectConcept(concept: ConceptOption) {
    await generateDetail(concept);
  }

  async function generateDetail(concept: ConceptOption) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/drafts/${draftId}/generate-detail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_concept: concept }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "企画文の生成に失敗しました");
        return;
      }
      onGenerated();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleCustomSubmit() {
    if (!customLabel.trim() || !customRationale.trim()) {
      setError("ラベルとコンセプト説明を入力してください");
      return;
    }

    const base = conceptOptions[0];
    if (!base) {
      setError("ベースとなるコンセプトがありません");
      return;
    }

    await generateDetail({
      ...base,
      label: customLabel.trim(),
      rationale: customRationale.trim(),
      tone: customTone,
      is_custom: true,
    } as ConceptOption & { is_custom?: boolean });
  }

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-brass">企画文を生成中…</p>
        <p className="mt-2 text-xs text-txt-muted">集客文の品質を優先して作成しています</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle>コンセプトを選ぶ</SectionTitle>
      <p className="text-xs text-txt-muted">
        性格の異なる3案から1つ選ぶか、自分でコンセプトを書いてください。
      </p>

      {conceptOptions.map((concept, i) => (
        <Card key={i} className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-sm font-semibold text-heading">
              {concept.label}
            </h3>
            <span className="shrink-0 rounded bg-card-2 px-2 py-0.5 text-[10px] text-brass">
              {concept.tone}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-txt-2">{concept.rationale}</p>
          <p className="text-xs text-txt-muted">
            想定 {concept.suggested_headcount}名 ・ パート{" "}
            {concept.suggested_parts.map((p) => p.name).join(" / ")}
          </p>
          <Button variant="outline" onClick={() => selectConcept(concept)}>
            これにする
          </Button>
        </Card>
      ))}

      <SectionTitle>自分でコンセプトを書く</SectionTitle>
      <div>
        <label className="mb-1 block text-xs text-txt-muted">ラベル</label>
        <input
          className={inputClass}
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          placeholder="少人数でじっくり派"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-txt-muted">コンセプト説明</label>
        <textarea
          className={`${inputClass} min-h-20 resize-y`}
          value={customRationale}
          onChange={(e) => setCustomRationale(e.target.value)}
          placeholder="なぜこの会を開くのか"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-txt-muted">文体タグ</label>
        <select
          className={inputClass}
          value={customTone}
          onChange={(e) => setCustomTone(e.target.value)}
        >
          <option value="emotional">感情訴求</option>
          <option value="informative">情報整理</option>
          <option value="casual">カジュアル</option>
        </select>
      </div>
      <Button variant="outline" onClick={handleCustomSubmit}>
        このコンセプトで企画文を生成
      </Button>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
