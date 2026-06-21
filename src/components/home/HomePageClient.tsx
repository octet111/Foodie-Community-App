import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function HomePageClient() {
  return (
    <div className="flex flex-col gap-3">
      <Link href="/events">
        <Button className="w-full">企画一覧</Button>
      </Link>
      <Link href="/shops">
        <Button className="w-full">店リスト</Button>
      </Link>
    </div>
  );
}
