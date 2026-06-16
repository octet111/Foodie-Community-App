import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import {
  getCommunitySettings,
  getCurrentProfile,
} from "@/lib/app-data";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [community, profile] = await Promise.all([
    getCommunitySettings(),
    getCurrentProfile(),
  ]);

  return (
    <AppShell community={community} profile={profile}>
      {children}
    </AppShell>
  );
}
