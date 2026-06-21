import { redirect } from "next/navigation";
import { SettingsPageClient } from "@/components/settings/SettingsPageClient";
import { getCurrentProfile } from "@/lib/app-data";
import { getSettingsPageData } from "@/lib/settings-data";

export const metadata = {
  title: "コミュニティ設定",
};

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/me");

  const data = await getSettingsPageData();

  return (
    <div className="mx-auto max-w-2xl">
      <SettingsPageClient profile={profile} initial={data} />
    </div>
  );
}
