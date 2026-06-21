"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { NavIcon } from "@/components/layout/NavIcon";

function isActive(pathname: string, match: (p: string) => boolean) {
  return match(pathname);
}

function getNavItems(isAdmin: boolean) {
  return NAV_ITEMS.filter(
    (item) => !("adminOnly" in item && item.adminOnly) || isAdmin,
  );
}

type NavProps = {
  isAdmin: boolean;
};

export function BottomNav({ isAdmin }: NavProps) {
  const pathname = usePathname();
  const items = getNavItems(isAdmin);

  return (
    <nav
      aria-label="メインナビゲーション"
      className="flex shrink-0 border-t border-line bg-[#323F58] px-1.5 pt-2 pb-2.5 md:hidden"
    >
      {items.map((item) => {
        const active = isActive(pathname, item.match);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 text-[10px] font-medium ${active ? "font-bold text-[#EDE9DF]" : "text-[#8E96AB]"}`}
          >
            <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SideNav({ isAdmin }: NavProps) {
  const pathname = usePathname();
  const items = getNavItems(isAdmin);

  return (
    <nav
      aria-label="サイドナビゲーション"
      className="hidden w-52 shrink-0 flex-col border-r border-line bg-[#323F58] py-4 md:flex"
    >
      {items.map((item) => {
        const active = isActive(pathname, item.match);

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
            <NavIcon name={item.icon} className="h-4 w-4 shrink-0 opacity-90" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
