import type { ReactNode } from "react";

type SectionTitleProps = {
  children: ReactNode;
  className?: string;
};

export function SectionTitle({ children, className = "" }: SectionTitleProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <h2 className="shrink-0 font-display text-[10px] font-semibold tracking-[var(--tracking-section)] text-brass">
        {children}
      </h2>
      <div className="h-px flex-1 bg-gradient-to-r from-brass/40 to-transparent" />
    </div>
  );
}
