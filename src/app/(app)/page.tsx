import { SectionTitle } from "@/components/ui/SectionTitle";
import { EventsPageClient } from "@/components/events/EventsPageClient";
import { getEventsList } from "@/lib/events-data";

export default async function HomePage() {
  const events = await getEventsList();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <SectionTitle>企画一覧</SectionTitle>
      <EventsPageClient events={events} />
    </div>
  );
}
