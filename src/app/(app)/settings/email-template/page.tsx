import { redirect } from "next/navigation";
import { EmailTemplateSettingsClient } from "@/components/settings/EmailTemplateSettingsClient";
import { getCurrentProfile } from "@/lib/app-data";
import { getCommunitySettingsFull } from "@/lib/settings-data";

export const metadata = {
  title: "メールテンプレート",
};

export default async function EmailTemplateSettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/me");

  const settings = await getCommunitySettingsFull();

  return (
    <div className="mx-auto max-w-2xl">
      <EmailTemplateSettingsClient settings={settings} />
    </div>
  );
}
