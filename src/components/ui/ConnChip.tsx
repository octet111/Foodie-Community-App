import type { ClaimType } from "@/lib/constants";
import { CLAIM_LABELS } from "@/lib/constants";

type ConnChipProps = {
  type: ClaimType;
  className?: string;
};

export function ConnChip({ type, className = "" }: ConnChipProps) {
  return (
    <span
      className={`inline-flex rounded-lg border border-brass/35 bg-brass/15 px-1.5 py-0.5 text-[9px] font-bold text-brass ${className}`}
    >
      {CLAIM_LABELS[type]}
    </span>
  );
}
