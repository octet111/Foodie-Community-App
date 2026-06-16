import type { EventStatus } from "@/lib/constants";
import { EVENT_STATUS_LABELS } from "@/lib/constants";

type StatusBadgeProps = {
  status: EventStatus;
  className?: string;
};

const variantClass = {
  open: "bg-green/15 text-green",
  closed: "bg-line/80 text-txt-2",
  held: "bg-line/60 text-txt-2",
  archived: "bg-line/40 text-txt-muted",
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const { label, variant } = EVENT_STATUS_LABELS[status];

  return (
    <span
      className={`inline-flex rounded-[10px] px-2 py-0.5 text-[10px] font-bold tracking-[0.05em] ${variantClass[variant]} ${className}`}
    >
      {label}
    </span>
  );
}
