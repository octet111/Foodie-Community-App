import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-line bg-card p-[var(--space-card-pad)] ${className}`}
    >
      {children}
    </div>
  );
}
