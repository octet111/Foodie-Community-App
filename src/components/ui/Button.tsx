import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "outline" | "disabled";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-inv text-[var(--color-invert-txt)] border border-transparent hover:opacity-90",
  outline:
    "bg-transparent text-txt border border-[#5D6B89] hover:border-brass/50",
  disabled: "bg-card-2 text-txt-muted border border-line cursor-not-allowed",
};

export function Button({
  variant = "primary",
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const resolved = disabled ? "disabled" : variant;

  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-[var(--radius-btn)] px-3.5 py-2 text-xs font-bold tracking-[0.04em] transition-opacity ${variantClass[resolved]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
