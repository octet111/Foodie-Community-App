import { redirect } from "next/navigation";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ShopsPageClient } from "@/components/shops/ShopsPageClient";
import { getCurrentProfile } from "@/lib/app-data";
import { getClaimGroups, getUserStocks } from "@/lib/shops-data";

export default async function ShopsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const [stocks, claimGroups] = await Promise.all([
    getUserStocks(profile.id),
    getClaimGroups(),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <SectionTitle>店リスト</SectionTitle>
      <ShopsPageClient
        profile={profile}
        stocks={stocks}
        claimGroups={claimGroups}
      />
    </div>
  );
}
