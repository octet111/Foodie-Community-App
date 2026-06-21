import { redirect } from "next/navigation";
import { MePageClient } from "@/components/me/MePageClient";
import { getCurrentProfile } from "@/lib/app-data";
import { getMyPageData } from "@/lib/me-data";

export const metadata = {
  title: "マイページ",
};

export default async function MePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const data = await getMyPageData(profile.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <MePageClient profile={profile} data={data} />
    </div>
  );
}
