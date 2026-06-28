import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DraftFlowClient } from "@/components/drafts/DraftListClient";
import { getCurrentProfile } from "@/lib/app-data";
import { getDraftById } from "@/lib/drafts-data";

type DraftDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DraftDetailPage({ params }: DraftDetailPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { id } = await params;
  const draft = await getDraftById(id, profile.id);
  if (!draft || draft.status !== "generated") notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <Link href="/events/drafts" className="text-xs text-txt-muted hover:text-brass">
        ‹ ドラフト一覧へ
      </Link>
      <DraftFlowClient draft={draft} />
    </div>
  );
}
