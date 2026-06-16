import type { ReactNode } from "react";
import type { AppProfile, CommunitySettings } from "@/lib/app-data";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav, SideNav } from "@/components/layout/AppNav";

type AppShellProps = {
  community: CommunitySettings;
  profile: AppProfile | null;
  headerTitle?: string;
  children: ReactNode;
};

export function AppShell({
  community,
  profile,
  headerTitle,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-full flex-1">
      <SideNav />
      <div className="flex min-h-full flex-1 flex-col">
        <AppHeader
          community={community}
          profile={profile}
          title={headerTitle}
        />
        <main className="flex-1 overflow-y-auto p-[var(--space-body-pad)]">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
