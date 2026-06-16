import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConnChip } from "@/components/ui/ConnChip";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function UiTestPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <SectionTitle>落款バッジ（RarityBadge）</SectionTitle>
      <div className="flex flex-wrap gap-2">
        <RarityBadge rarity="walk_in" />
        <RarityBadge rarity="reservable" />
        <RarityBadge rarity="referral_only" />
        <RarityBadge rarity="months_wait" />
        <RarityBadge rarity="members_only" />
      </div>
      <p className="text-[10px] text-txt-muted">
        walk_in / reservable は非表示
      </p>

      <SectionTitle>ステータス（StatusBadge）</SectionTitle>
      <div className="flex flex-wrap gap-2">
        <StatusBadge status="open" />
        <StatusBadge status="closed" />
        <StatusBadge status="held" />
      </div>

      <SectionTitle>コネ種別（ConnChip）</SectionTitle>
      <div className="flex flex-wrap gap-2">
        <ConnChip type="regular" />
        <ConnChip type="acquaintance" />
        <ConnChip type="referral" />
        <ConnChip type="membership" />
        <ConnChip type="other" />
      </div>

      <SectionTitle>カード・ボタン</SectionTitle>
      <Card>
        <p className="mb-3 font-display text-sm text-heading">
          鮨 かね田
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary">主ボタン</Button>
          <Button variant="outline">外枠ボタン</Button>
          <Button variant="disabled" disabled>
            無効
          </Button>
        </div>
      </Card>
    </div>
  );
}
