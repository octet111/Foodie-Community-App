import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EventEditForm } from "@/components/events/EventEditForm";
import { getCurrentProfile } from "@/lib/app-data";
import { getEventById } from "@/lib/events-data";

type EventEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventEditPage({ params }: EventEditPageProps) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const event = await getEventById(id, profile.id);
  if (!event) notFound();

  const canEdit =
    event.organizer_id === profile.id || profile.role === "admin";
  if (!canEdit) redirect(`/events/${id}`);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <Link
        href={`/events/${id}`}
        className="text-xs text-txt-muted hover:text-brass"
      >
        ‹ 企画詳細へ
      </Link>
      <EventEditForm event={event} />
    </div>
  );
}
