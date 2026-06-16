import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getCurrentProfile } from "@/lib/app-data";

export default async function MePage() {
  const profile = await getCurrentProfile();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <Card className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-line text-sm font-bold text-txt-2">
          {profile?.nickname?.charAt(0) ?? "?"}
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-heading">
            {profile?.nickname ?? "—"}
          </p>
          <p className="text-[11px] text-txt-2">ニックネームを編集</p>
        </div>
        {profile?.role === "admin" && (
          <span className="ml-auto rounded-lg border border-brass/35 bg-brass/15 px-2 py-0.5 text-[9px] font-bold text-brass">
            admin
          </span>
        )}
      </Card>

      {profile?.role === "admin" && (
        <>
          <SectionTitle>管理者</SectionTitle>
          <Link
            href="/settings"
            className="rounded-[var(--radius-card)] border border-dashed border-line bg-card px-3 py-2.5 text-sm text-txt-2"
          >
            コミュニティ設定 →
          </Link>
        </>
      )}

      <SectionTitle>開発</SectionTitle>
      <Link
        href="/dev/ui"
        className="text-sm text-brass underline-offset-2 hover:underline"
      >
        UIコンポーネント一覧
      </Link>
    </div>
  );
}
