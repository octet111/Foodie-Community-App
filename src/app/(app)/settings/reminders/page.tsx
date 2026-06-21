import { redirect } from "next/navigation";
import { ReminderSettingsClient } from "@/components/settings/ReminderSettingsClient";
import { getCurrentProfile } from "@/lib/app-data";
import { getCommunitySettingsFull } from "@/lib/settings-data";

export const metadata = {
  title: "リマインド設定",
};

export default async function ReminderSettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/me");

  const settings = await getCommunitySettingsFull();

  return (
    <div className="mx-auto max-w-2xl">
      <ReminderSettingsClient settings={settings} />
    </div>
  );
}
