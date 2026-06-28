import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SettlementPageClient } from "@/components/settlement/SettlementPageClient";
import { getCurrentProfile } from "@/lib/app-data";
import { getEventById } from "@/lib/events-data";
import {
  canAccessSettlementPage,
  ensureSettlement,
  getSettlementPageData,
  settlementItemsNeedSync,
  syncItemsFromParticipations,
} from "@/lib/settlement-data";

export const dynamic = "force-dynamic";

type SettlementPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SettlementPage({ params }: SettlementPageProps) {
  const { id: eventId } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const data = await getSettlementPageData(eventId, profile.id, profile.role);
  if (!data) notFound();

  const canAccess = canAccessSettlementPage(
    data.event,
    profile,
    data.isManager,
    data.items.length > 0,
  );

  if (!canAccess) notFound();

  let settlement = data.settlement;
  let items = data.items;
  let event = data.event;

  if (data.isManager && !settlement) {
    settlement = await ensureSettlement(eventId);
    if (!settlement) notFound();
  }

  if (data.isManager && settlement) {
    event = (await getEventById(eventId, profile.id)) ?? event;

    if (settlementItemsNeedSync(event.participations, items)) {
      await syncItemsFromParticipations(settlement, event);
      const refreshed = await getSettlementPageData(
        eventId,
        profile.id,
        profile.role,
      );
      if (refreshed) {
        settlement = refreshed.settlement ?? settlement;
        items = refreshed.items;
        event = refreshed.event;
      }
    }
  }

  if (!settlement && data.isManager) notFound();

  if (!data.isManager) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <Link
          href={`/events/${eventId}`}
          className="text-xs text-txt-muted hover:text-brass"
        >
          ‹ 企画詳細へ
        </Link>
        <h1 className="font-display text-base font-semibold text-heading">
          精算：{event.title}
        </h1>
        {items.length > 0 && settlement ? (
          <SettlementPageClient
            event={event}
            eventId={eventId}
            settlement={settlement}
            items={items}
            isManager={false}
            profile={profile}
            transferInfo={data.transferInfo}
            allProfiles={data.allProfiles}
          />
        ) : (
          <p className="text-sm text-txt-muted">
            精算はまだ開始されていません。
          </p>
        )}
      </div>
    );
  }

  if (!settlement) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <h1 className="font-display text-base font-semibold text-heading">
        精算：{event.title}
      </h1>
      <SettlementPageClient
        event={event}
        eventId={eventId}
        settlement={settlement}
        items={items}
        isManager
        profile={profile}
        transferInfo={data.transferInfo}
        allProfiles={data.allProfiles}
      />
    </div>
  );
}
