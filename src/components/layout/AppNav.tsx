"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";

function isActive(pathname: string, match: (p: string) => boolean) {
  return match(pathname);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="メインナビゲーション"
      className="flex shrink-0 border-t border-line bg-[#323F58] px-1.5 pt-2 pb-2.5 md:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.match);

        if ("fab" in item && item.fab) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-end text-[10px] font-medium text-txt-2"
            >
              <span
                className={`mb-0.5 flex h-[38px] w-[38px] items-center justify-center rounded-full text-xl shadow-[0_4px_14px_rgba(0,0,0,0.45)] ${active ? "bg-brass text-[var(--color-invert-txt)]" : "bg-inv text-[var(--color-invert-txt)]"}`}
              >
                ＋
              </span>
              {item.label}
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 text-[10px] font-medium ${active ? "font-bold text-[#EDE9DF]" : "text-[#8E96AB]"}`}
          >
            <span
              className={`h-5 w-5 rounded-[5px] border-[1.6px] opacity-90 ${active ? "border-current" : "border-current"}`}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="サイドナビゲーション"
      className="hidden w-52 shrink-0 flex-col border-r border-line bg-[#323F58] py-4 md:flex"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.match);

        if ("fab" in item && item.fab) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="mx-3 mb-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-txt-2 transition-colors hover:bg-card/50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-inv text-lg text-[var(--color-invert-txt)]">
                ＋
              </span>
              企画を作成
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mx-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              active
                ? "bg-card font-bold text-heading"
                : "font-medium text-txt-2 hover:bg-card/40"
            }`}
          >
            <span className="h-4 w-4 rounded border border-current opacity-80" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
