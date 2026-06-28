import Link from "next/link";
import { redirect } from "next/navigation";
import { DraftListClient } from "@/components/drafts/DraftListClient";
import { getCurrentProfile } from "@/lib/app-data";
import { getUserDrafts } from "@/lib/drafts-data";

export default async function DraftsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const drafts = await getUserDrafts(profile.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <Link href="/events" className="text-xs text-txt-muted hover:text-brass">
        ‹ 企画一覧へ
      </Link>
      <h1 className="font-display text-lg font-semibold text-heading">
        AI企画ドラフト
      </h1>
      <DraftListClient drafts={drafts} />
    </div>
  );
}
