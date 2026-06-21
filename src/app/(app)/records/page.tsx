import { EventCard } from "@/components/events/EventCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getCompletedEventsList } from "@/lib/events-data";

export const metadata = {
  title: "実績",
};

export default async function RecordsPage() {
  const events = await getCompletedEventsList();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <SectionTitle>実績</SectionTitle>
      {events.length === 0 ? (
        <p className="py-8 text-center text-sm text-txt-muted">
          精算確定した企画はまだありません
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
