import Image from "next/image";
import Link from "next/link";
import type { AppProfile, CommunitySettings } from "@/lib/app-data";
import type { NotificationItem } from "@/lib/notifications-data";
import { NotificationBell } from "@/components/layout/NotificationBell";

type AppHeaderProps = {
  community: CommunitySettings;
  profile: AppProfile | null;
  notifications: NotificationItem[];
  title?: string;
};

export function AppHeader({
  community,
  profile,
  notifications,
  title,
}: AppHeaderProps) {
  const displayTitle = title ?? community.name;

  return (
    <header className="flex shrink-0 items-center gap-2.5 border-b border-brass bg-bg/95 px-4 py-3 backdrop-blur-sm">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-brass font-display text-[15px] font-semibold text-brass">
        {community.logoUrl ? (
          <Image
            src={community.logoUrl}
            alt=""
            width={28}
            height={28}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          community.logoChar
        )}
      </div>
      <h1 className="min-w-0 flex-1 truncate font-display text-[15px] tracking-[var(--tracking-cname)] text-heading">
        {displayTitle}
      </h1>
      <NotificationBell initialItems={notifications} />
      <Link
        href="/me"
        aria-label={profile?.nickname ?? "マイページ"}
        className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-line text-[10px] font-bold text-txt-2"
        title={profile?.nickname}
      >
        {profile?.nickname?.charAt(0) ?? "?"}
      </Link>
    </header>
  );
}
