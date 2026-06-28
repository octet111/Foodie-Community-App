import Link from "next/link";
import { redirect } from "next/navigation";
import { DraftGenerateForm } from "@/components/drafts/DraftGenerateForm";
import { getCurrentProfile } from "@/lib/app-data";

export default async function DraftNewPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <Link href="/events/drafts" className="text-xs text-txt-muted hover:text-brass">
        ‹ ドラフト一覧へ
      </Link>
      <h1 className="font-display text-lg font-semibold text-heading">
        AI企画を生成
      </h1>
      <DraftGenerateForm />
    </div>
  );
}
