import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EventDetailClient } from "@/components/events/EventDetailClient";
import { getCurrentProfile } from "@/lib/app-data";
import { getEventById, getMemberProfiles } from "@/lib/events-data";

export const dynamic = "force-dynamic";

type EventDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const event = await getEventById(id, profile.id);
  if (!event) notFound();

  const canManageParticipants =
    event.organizer_id === profile.id || profile.role === "admin";
  const memberProfiles = canManageParticipants ? await getMemberProfiles() : [];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <Link href="/events" className="text-xs text-txt-muted hover:text-brass">
        ‹ 企画一覧へ
      </Link>
      <EventDetailClient
        event={event}
        profile={profile}
        memberProfiles={memberProfiles}
      />
    </div>
  );
}
