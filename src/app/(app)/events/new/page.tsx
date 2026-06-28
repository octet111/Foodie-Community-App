import Link from "next/link";
import { redirect } from "next/navigation";
import { EventCreateForm } from "@/components/events/EventCreateForm";
import { getCurrentProfile } from "@/lib/app-data";
import {
  getAllStocksExcept,
  getClaimGroups,
  getPublicStocks,
  getShopById,
  getUserStocks,
} from "@/lib/shops-data";

type EventNewPageProps = {
  searchParams: Promise<{ shopId?: string }>;
};

export default async function EventNewPage({ searchParams }: EventNewPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { shopId } = await searchParams;
  const [initialShop, stocks, publicStocks, claimGroups] = await Promise.all([
    shopId ? getShopById(shopId) : Promise.resolve(null),
    getUserStocks(profile.id),
    profile.role === "admin"
      ? getAllStocksExcept(profile.id)
      : getPublicStocks(profile.id),
    getClaimGroups(),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <Link href="/events" className="text-xs text-txt-muted hover:text-brass">
        ‹ 企画一覧へ
      </Link>
      <EventCreateForm
        profile={profile}
        stocks={stocks}
        publicStocks={publicStocks}
        claimGroups={claimGroups}
        initialShop={initialShop}
      />
    </div>
  );
}
