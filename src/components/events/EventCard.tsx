import Link from "next/link";
import type { EventListItem } from "@/lib/events-data";
import { formatHeldAt } from "@/lib/event-dates";
import { formatParticipationSummary } from "@/lib/event-participation";
import { Card } from "@/components/ui/Card";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ShopThumb } from "@/components/shops/ShopThumb";

type EventCardProps = {
  event: EventListItem;
};

export function EventCard({ event }: EventCardProps) {
  const dimmed = event.status !== "open";

  return (
    <Link href={`/events/${event.id}`} className="block">
      <Card
        className={`flex flex-col gap-2 transition-opacity hover:border-brass/30 ${dimmed ? "opacity-55" : ""}`}
      >
        <ShopThumb shop={event.shop} className="h-32 w-full" />
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-display text-base font-semibold text-heading">
            {event.title}
          </h2>
          <RarityBadge rarity={event.shop.rarity} />
        </div>
        <p className="text-xs text-txt-muted">
          {formatHeldAt(event.held_at)}
          {event.location ? `・${event.location}` : ""}
          {"　企画："}
          {event.organizerNickname}
        </p>
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={event.status} />
          <span className="text-[10px] text-txt-muted">
            {formatParticipationSummary(event.parts)}
          </span>
        </div>
      </Card>
    </Link>
  );
}
