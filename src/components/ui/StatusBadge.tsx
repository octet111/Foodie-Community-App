import type { EventStatus } from "@/lib/constants";
import { EVENT_STATUS_LABELS } from "@/lib/constants";

type StatusBadgeProps = {
  status: EventStatus;
  className?: string;
};

const variantClass = {
  open: "border-2 border-green/50 bg-green/15 text-green",
  closed: "border border-line bg-line/80 text-txt-2",
  held: "border border-line bg-line/60 text-txt-2",
  archived: "border border-line/60 bg-line/40 text-txt-muted",
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const { label, variant } = EVENT_STATUS_LABELS[status];

  return (
    <span
      className={`inline-flex rounded-[10px] px-2.5 py-1 text-[11px] font-bold tracking-[0.05em] ${variantClass[variant]} ${className}`}
    >
      {label}
    </span>
  );
}
