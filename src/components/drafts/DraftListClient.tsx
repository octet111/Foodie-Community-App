"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DraftDetail } from "@/lib/drafts-data";
import { DraftConceptSelect } from "@/components/drafts/DraftConceptSelect";
import { DraftEditForm } from "@/components/drafts/DraftEditForm";

type DraftFlowClientProps = {
  draft: DraftDetail;
};

export function DraftFlowClient({ draft: initialDraft }: DraftFlowClientProps) {
  const router = useRouter();
  const isDetailPhase =
    initialDraft.generation_phase === "detail" ||
    Boolean(initialDraft.title && initialDraft.description);

  if (isDetailPhase) {
    return <DraftEditForm draft={initialDraft} />;
  }

  return (
    <DraftConceptSelect
      draftId={initialDraft.id}
      conceptOptions={initialDraft.concept_options}
      onGenerated={() => router.refresh()}
    />
  );
}

type DraftListClientProps = {
  drafts: { id: string; title: string | null; generation_phase: string; updated_at: string }[];
};

export function DraftListClient({ drafts }: DraftListClientProps) {
  async function discardDraft(id: string) {
    if (!confirm("このドラフトを破棄しますか？")) return;
    await fetch(`/api/drafts/${id}`, { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-3">
      <Link href="/events/drafts/new">
        <button
          type="button"
          className="w-full rounded-[var(--radius-btn)] bg-invert-bg px-4 py-2.5 text-sm font-bold text-invert-txt"
        >
          ＋ AIで企画を生成
        </button>
      </Link>

      {drafts.length === 0 ? (
        <p className="py-8 text-center text-sm text-txt-muted">
          進行中のドラフトはありません
        </p>
      ) : (
        drafts.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between rounded-[var(--radius-card)] border border-line bg-card p-3"
          >
            <Link href={`/events/drafts/${d.id}`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-heading">
                {d.title ?? "（コンセプト選択中）"}
              </p>
              <p className="text-xs text-txt-muted">
                {d.generation_phase === "concept" ? "コンセプト選択" : "編集・採用"}
              </p>
            </Link>
            <button
              type="button"
              className="ml-2 shrink-0 text-xs text-[#E8694F] hover:underline"
              onClick={() => discardDraft(d.id)}
            >
              破棄
            </button>
          </div>
        ))
      )}
    </div>
  );
}
