import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ title, children, footer }: AuthCardProps) {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-brass font-display text-2xl font-semibold text-brass">
          美
        </div>
        <h1 className="font-display text-xl tracking-[var(--tracking-cname)] text-heading">
          美食倶楽部
        </h1>
      </div>
      <div className="rounded-[var(--radius-card)] border border-line bg-card p-5">
        <h2 className="mb-5 font-display text-sm tracking-[var(--tracking-section)] text-brass">
          {title}
        </h2>
        {children}
      </div>
      {footer && <div className="mt-4 text-center text-sm">{footer}</div>}
    </div>
  );
}

export function AuthField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold text-txt-2">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-txt-muted">{hint}</span>}
    </label>
  );
}

export const authInputClass =
  "w-full rounded-[var(--radius-input)] border border-line bg-card-2 px-3 py-2.5 text-sm text-txt placeholder:text-txt-muted outline-none focus:border-brass";

export const authButtonPrimaryClass =
  "w-full rounded-[var(--radius-btn)] bg-inv px-4 py-2.5 text-sm font-bold text-[var(--color-invert-txt)] disabled:opacity-50";

export const authButtonOutlineClass =
  "w-full rounded-[var(--radius-btn)] border border-line bg-transparent px-4 py-2.5 text-sm font-bold text-txt";

export const authLinkClass = "text-brass underline-offset-2 hover:underline";
