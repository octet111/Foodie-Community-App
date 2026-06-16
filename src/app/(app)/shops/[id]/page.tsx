import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ShopDetailClient } from "@/app/(app)/shops/[id]/ShopDetailClient";
import { getCurrentProfile } from "@/lib/app-data";
import {
  getShopById,
  getShopClaims,
  getShopEvents,
  getUserClaimForShop,
} from "@/lib/shops-data";

type ShopDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ShopDetailPage({ params }: ShopDetailPageProps) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const shop = await getShopById(id);
  if (!shop) notFound();

  const [claims, events, userClaim] = await Promise.all([
    getShopClaims(id),
    getShopEvents(id),
    getUserClaimForShop(id, profile.id),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <Link href="/shops" className="text-xs text-txt-muted hover:text-brass">
        ‹ 店リストへ
      </Link>
      <ShopDetailClient
        shop={shop}
        claims={claims}
        events={events}
        profile={profile}
        userClaim={userClaim}
      />
    </div>
  );
}
