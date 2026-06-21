import Link from "next/link";
import { usePathname } from "next/navigation";

const SETTINGS_TABS = [
  { href: "/settings", label: "コミュニティ", exact: true },
  { href: "/settings/reminders", label: "リマインド", exact: false },
  { href: "/settings/email-template", label: "メール", exact: false },
] as const;

export function SettingsSubNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="設定メニュー"
      className="flex rounded-[var(--radius-btn)] border border-line bg-card p-0.5"
    >
      {SETTINGS_TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 rounded-md py-1.5 text-center text-xs font-bold transition-colors ${
              active ? "bg-card-2 text-txt" : "text-txt-muted hover:text-txt-2"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
