"use client";

export type PartDraft = {
  key: string;
  name: string;
  capacity: string;
  fee_estimate: string;
};

type EventPartEditorProps = {
  parts: PartDraft[];
  onChange: (parts: PartDraft[]) => void;
};

const inputClass =
  "w-full rounded-[var(--radius-input)] border border-line bg-card-2 px-2 py-1.5 text-sm text-txt outline-none focus:border-brass/50";

let partKeyCounter = 0;

export function createDefaultPart(name = "一次会"): PartDraft {
  return {
    key: `part-${++partKeyCounter}`,
    name,
    capacity: "10",
    fee_estimate: "0",
  };
}

export function EventPartEditor({ parts, onChange }: EventPartEditorProps) {
  function updatePart(key: string, field: keyof PartDraft, value: string) {
    onChange(
      parts.map((p) => (p.key === key ? { ...p, [field]: value } : p)),
    );
  }

  function removePart(key: string) {
    if (parts.length <= 1) return;
    onChange(parts.filter((p) => p.key !== key));
  }

  function addPart() {
    const n = parts.length + 1;
    const labels = ["一次会", "二次会", "三次会", "四次会", "五次会"];
    const name = labels[n - 1] ?? `${n}次会`;
    onChange([...parts, createDefaultPart(name)]);
  }

  return (
    <div className="flex flex-col gap-2">
      {parts.map((part) => (
        <div
          key={part.key}
          className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-card-2 p-2"
        >
          <label className="min-w-[80px] flex-1 text-xs text-txt-muted">
            パート名
            <input
              className={`${inputClass} mt-1`}
              value={part.name}
              onChange={(e) => updatePart(part.key, "name", e.target.value)}
            />
          </label>
          <label className="w-20 text-xs text-txt-muted">
            定員
            <input
              type="number"
              min={1}
              aria-label={`${part.name}の定員`}
              className={`${inputClass} mt-1`}
              value={part.capacity}
              onChange={(e) => updatePart(part.key, "capacity", e.target.value)}
            />
          </label>
          <label className="w-24 text-xs text-txt-muted">
            想定費用
            <input
              type="number"
              min={0}
              className={`${inputClass} mt-1`}
              value={part.fee_estimate}
              onChange={(e) =>
                updatePart(part.key, "fee_estimate", e.target.value)
              }
            />
          </label>
          {parts.length > 1 && (
            <button
              type="button"
              className="pb-1.5 text-xs text-[#E8694F] hover:underline"
              onClick={() => removePart(part.key)}
            >
              削除
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        className="text-xs font-bold text-brass hover:underline"
        onClick={addPart}
      >
        ＋ パートを追加
      </button>
    </div>
  );
}

export function validateParts(parts: PartDraft[]): string | null {
  for (const p of parts) {
    if (!p.name.trim()) return "パート名を入力してください";
    const cap = Number(p.capacity);
    if (!Number.isInteger(cap) || cap < 1) return "定員は1以上の整数で入力してください";
    const fee = Number(p.fee_estimate);
    if (!Number.isInteger(fee) || fee < 0) return "想定費用は0以上の整数で入力してください";
  }
  return null;
}

export function partsToInsert(
  parts: PartDraft[],
): { name: string; capacity: number; fee_estimate: number; sort_order: number }[] {
  return parts.map((p, i) => ({
    name: p.name.trim(),
    capacity: Number(p.capacity),
    fee_estimate: Number(p.fee_estimate),
    sort_order: i + 1,
  }));
}
