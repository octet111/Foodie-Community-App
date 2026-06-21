import { SectionTitle } from "@/components/ui/SectionTitle";
import { HomePageClient } from "@/components/home/HomePageClient";

export const metadata = {
  title: "ホーム",
};

export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <SectionTitle>ホーム</SectionTitle>
      <HomePageClient />
    </div>
  );
}
