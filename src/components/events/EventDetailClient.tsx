"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { AppProfile } from "@/lib/app-data";
import type { CommentRow, EventDetail, MemberProfile } from "@/lib/events-data";
import { formatHeldAt } from "@/lib/event-dates";
import {
  canCancelPart,
  canJoinPart,
  canManageParticipations,
  canReopenEvent,
  getFirstPart,
  isPartFull,
  sumFeeEstimate,
} from "@/lib/event-participation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ShopThumb } from "@/components/shops/ShopThumb";
import { UserAvatar } from "@/components/ui/UserAvatar";
import Link from "next/link";

type EventDetailClientProps = {
  event: EventDetail;
  profile: AppProfile;
  memberProfiles: MemberProfile[];
};

export function EventDetailClient({
  event,
  profile,
  memberProfiles,
}: EventDetailClientProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentRow[]>(event.comments);
  const [parts, setParts] = useState(event.parts);
  const [status, setStatus] = useState(event.status);
  const [myJoinedPartIds, setMyJoinedPartIds] = useState(
    new Set(event.myJoinedPartIds),
  );
  const [participations, setParticipations] = useState(event.participations);
  const [addUserByPart, setAddUserByPart] = useState<Record<string, string>>(
    {},
  );
  const [finalizerId, setFinalizerId] = useState<string | null>(
    event.finalizer_id,
  );
  const [finalizerDraft, setFinalizerDraft] = useState(
    event.finalizer_id ?? "",
  );

  const isOrganizer = event.organizer_id === profile.id;
  const isAdmin = profile.role === "admin";
  const isFinalizer = finalizerId === profile.id;
  const joinedAny = myJoinedPartIds.size > 0;
  const canManage = canManageParticipations(status, isOrganizer, isAdmin);
  const canSetFinalizer =
    (isOrganizer || isAdmin) && (status === "open" || status === "closed");
  const canReopen = canReopenEvent(status, isOrganizer, isAdmin);
  const canOpenSettlement =
    isOrganizer || isAdmin || isFinalizer || joinedAny;
  const finalizerNickname =
    (finalizerId
      ? memberProfiles.find((p) => p.id === finalizerId)?.nickname
      : null) ??
    event.finalizerNickname ??
    (finalizerId
      ? (participations.find((p) => p.user_id === finalizerId)?.nickname ??
        null)
      : null);
  const feeEstimate = sumFeeEstimate(parts, myJoinedPartIds);

  const firstPart = getFirstPart(parts);
  const firstPartParticipantOptions = firstPart
    ? participations
        .filter((p) => p.event_part_id === firstPart.id)
        .filter(
          (p, i, arr) =>
            arr.findIndex((x) => x.user_id === p.user_id) === i,
        )
        .map((p) => ({ id: p.user_id, nickname: p.nickname }))
    : [];
  const firstPartParticipantIds = new Set(
    firstPartParticipantOptions.map((p) => p.id),
  );

  async function refreshFromServer() {
    router.refresh();
  }

  async function handleJoin(partId: string) {
    setError(null);
    setBusy(partId);
    const supabase = createClient();

    const { error: insertError } = await supabase.from("participations").insert({
      event_part_id: partId,
      user_id: profile.id,
      status: "joined",
    });

    if (insertError) {
      setBusy(null);
      setError(insertError.message);
      return;
    }

    const part = parts.find((p) => p.id === partId);
    setMyJoinedPartIds((prev) => new Set([...prev, partId]));
    setParticipations((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        user_id: profile.id,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
        event_part_id: partId,
      },
    ]);
    if (part) {
      setParts((prev) =>
        prev.map((p) =>
          p.id === partId ? { ...p, joinedCount: p.joinedCount + 1 } : p,
        ),
      );
    }

    setBusy(null);
    refreshFromServer();
  }

  async function handleCancel(partId: string) {
    setError(null);
    setBusy(partId);
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from("participations")
      .delete()
      .eq("event_part_id", partId)
      .eq("user_id", profile.id);

    if (deleteError) {
      setBusy(null);
      setError(deleteError.message);
      return;
    }

    setMyJoinedPartIds((prev) => {
      const next = new Set(prev);
      next.delete(partId);
      return next;
    });
    setParticipations((prev) =>
      prev.filter(
        (p) => !(p.user_id === profile.id && p.event_part_id === partId),
      ),
    );
    setParts((prev) =>
      prev.map((p) =>
        p.id === partId ? { ...p, joinedCount: Math.max(0, p.joinedCount - 1) } : p,
      ),
    );
    setBusy(null);
    refreshFromServer();
  }

  async function handleOrganizerRemove(participationId: string, partId: string) {
    if (!canManage) return;
    setError(null);
    setBusy(participationId);
    const supabase = createClient();

    const target = participations.find((p) => p.id === participationId);
    const { error: deleteError } = await supabase
      .from("participations")
      .delete()
      .eq("id", participationId);

    if (deleteError) {
      setBusy(null);
      setError(deleteError.message);
      return;
    }

    setParticipations((prev) => prev.filter((p) => p.id !== participationId));
    if (target && target.user_id === profile.id) {
      setMyJoinedPartIds((prev) => {
        const next = new Set(prev);
        next.delete(partId);
        return next;
      });
    }
    setParts((prev) =>
      prev.map((p) =>
        p.id === partId ? { ...p, joinedCount: Math.max(0, p.joinedCount - 1) } : p,
      ),
    );
    setBusy(null);
    refreshFromServer();
  }

  async function handleOrganizerAdd(userId: string, partId: string) {
    if (!canManage || !userId) return;
    const part = parts.find((p) => p.id === partId);
    if (!part || isPartFull(part)) {
      setError("定員に達しているため追加できません");
      return;
    }
    setError(null);
    setBusy(`add-${partId}-${userId}`);
    const supabase = createClient();

    const { data, error: insertError } = await supabase
      .from("participations")
      .insert({
        event_part_id: partId,
        user_id: userId,
        status: "joined",
      })
      .select("id, user_id, event_part_id")
      .single();

    if (insertError || !data) {
      setBusy(null);
      setError(insertError?.message ?? "参加者の追加に失敗しました");
      return;
    }

    const member = memberProfiles.find((p) => p.id === userId);
    const nickname = member?.nickname ?? "不明";
    setParticipations((prev) => [
      ...prev,
      {
        id: data.id,
        user_id: data.user_id,
        nickname,
        avatarUrl: member?.avatarUrl ?? null,
        event_part_id: partId,
      },
    ]);
    if (userId === profile.id) {
      setMyJoinedPartIds((prev) => new Set([...prev, partId]));
    }
    setParts((prev) =>
      prev.map((p) =>
        p.id === partId ? { ...p, joinedCount: p.joinedCount + 1 } : p,
      ),
    );
    setAddUserByPart((prev) => ({ ...prev, [partId]: "" }));
    setBusy(null);
    refreshFromServer();
  }

  async function handleSaveFinalizer() {
    if (!canSetFinalizer) return;
    if (
      finalizerDraft &&
      !firstPartParticipantIds.has(finalizerDraft)
    ) {
      setError("立替者は一次会の参加者から選択してください");
      return;
    }
    setError(null);
    setBusy("finalizer");
    const supabase = createClient();

    const { data, error: rpcError } = await supabase.rpc("set_event_finalizer", {
      p_event_id: event.id,
      p_finalizer_id: finalizerDraft || null,
    });

    if (rpcError || !data) {
      setBusy(null);
      setError(rpcError?.message ?? "立替者の設定に失敗しました");
      return;
    }

    setFinalizerId(data.finalized_by);
    setFinalizerDraft(data.finalized_by ?? "");
    setBusy(null);
    refreshFromServer();
  }

  async function handleCloseEvent() {
    if (!isOrganizer && !isAdmin) return;
    setBusy("close");
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("events")
      .update({ status: "closed" })
      .eq("id", event.id);

    if (updateError) {
      setBusy(null);
      setError(updateError.message);
      return;
    }

    setStatus("closed");
    setBusy(null);
    refreshFromServer();
  }

  async function handleReopenEvent() {
    if (!canReopen) return;
    if (
      !confirm(
        "この企画を募集中に戻しますか？参加者が再度参加表明できるようになります。",
      )
    ) {
      return;
    }

    setError(null);
    setBusy("reopen");
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("events")
      .update({ status: "open" })
      .eq("id", event.id)
      .eq("status", "closed");

    if (updateError) {
      setBusy(null);
      setError(updateError.message);
      return;
    }

    setStatus("open");
    setBusy(null);
    refreshFromServer();
  }

  async function handleDelete() {
    if (!isOrganizer && !isAdmin) return;
    if (!confirm("この企画を削除しますか？（論理削除・データは保持されます）")) return;
    setBusy("delete");
    const supabase = createClient();
    await supabase
      .from("events")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", event.id);
    router.push("/events");
    router.refresh();
  }

  const joinedPartNames = parts
    .filter((p) => myJoinedPartIds.has(p.id))
    .map((p) => p.name)
    .join("・");

  const showParticipantsBlock =
    canManage ||
    parts.some((part) =>
      participations.some((p) => p.event_part_id === part.id),
    );

  const selectClass =
    "min-w-0 flex-1 rounded-[var(--radius-input)] border border-line bg-[#34415A] px-3 py-2 text-sm text-txt outline-none focus:border-brass/50";

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3">
        <ShopThumb shop={event.shop} className="h-40 w-full" />
        <div className="flex items-start justify-between gap-2">
          <h1 className="font-display text-lg font-semibold text-heading">
            {event.title}
          </h1>
          <RarityBadge rarity={event.shop.rarity} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
        </div>
        <p className="text-sm text-txt-2">
          {formatHeldAt(event.held_at)}
          {event.location ? `〜・${event.location}` : ""}
          {"（"}
          <Link href={`/shops/${event.shop.id}`} className="text-brass underline">
            {event.shop.name}
          </Link>
          {" ↗）"}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line/80 pt-2.5 text-xs">
          <span className="text-txt-muted">
            企画{" "}
            <span className="font-bold text-txt-2">{event.organizerNickname}</span>
          </span>
          <span className="text-line" aria-hidden>
            ·
          </span>
          <span className="text-txt-muted">
            立替{" "}
            <span className="font-bold text-txt-2">
              {finalizerNickname ?? "未設定"}
            </span>
          </span>
        </div>
        {event.description && (
          <p className="whitespace-pre-wrap border-t border-line/80 pt-3 text-sm leading-relaxed text-txt-2">
            {event.description}
          </p>
        )}
      </Card>

      {joinedAny && !isOrganizer && (
        <Card className="border-2 border-green/45 bg-green/10">
          <div className="flex items-start gap-2.5">
            <span
              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-green bg-green/20 text-xs font-bold text-green"
              aria-hidden
            >
              ✓
            </span>
            <div>
              <p className="text-sm font-bold text-green">参加表明済み</p>
              <p className="mt-0.5 text-xs leading-relaxed text-txt-2">
                {joinedPartNames}に参加
                {status === "open"
                  ? "・締切前まで変更できます"
                  : "・締切済みです"}
              </p>
            </div>
          </div>
        </Card>
      )}

      {(isOrganizer || isAdmin || canOpenSettlement) && (
        <Card className="flex flex-col gap-2.5 py-3">
          {(isOrganizer || isAdmin) && status === "open" && (
            <div className="flex flex-wrap gap-2">
              <Link href={`/events/${event.id}/edit`}>
                <Button variant="outline">編集</Button>
              </Link>
              <Button
                variant="outline"
                disabled={busy === "close"}
                onClick={handleCloseEvent}
              >
                締切にする
              </Button>
              <Button
                variant="danger"
                disabled={busy === "delete"}
                onClick={handleDelete}
              >
                削除
              </Button>
            </div>
          )}

          {(isOrganizer || isAdmin) && status === "closed" && (
            <div className="flex flex-wrap gap-2">
              <Link href={`/events/${event.id}/edit`}>
                <Button variant="outline">編集</Button>
              </Link>
              <Button
                variant="outline"
                disabled={busy === "reopen"}
                onClick={handleReopenEvent}
              >
                募集中に戻す
              </Button>
              <Button
                variant="danger"
                disabled={busy === "delete"}
                onClick={handleDelete}
              >
                削除
              </Button>
            </div>
          )}

          {(isOrganizer || isAdmin) &&
            status !== "open" &&
            status !== "closed" && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="danger"
                disabled={busy === "delete"}
                onClick={handleDelete}
              >
                削除
              </Button>
            </div>
          )}

          {canOpenSettlement && (
            <div
              className={
                isOrganizer || isAdmin ? "border-t border-line/60 pt-2.5" : ""
              }
            >
              <Link href={`/events/${event.id}/settlement`}>
                <Button variant="outline" className="w-full">
                  精算へ
                </Button>
              </Link>
            </div>
          )}
        </Card>
      )}

      <SectionHeader
        title="参加パート"
        caption="自分が参加するパートを選びます"
      />

      <div className="flex flex-col gap-2">
        {parts.map((part) => {
          const userJoined = myJoinedPartIds.has(part.id);
          const full = isPartFull(part);
          const showJoin = canJoinPart(status, part, userJoined);
          const showCancel = canCancelPart(status, userJoined);

          return (
            <PartActionRow
              key={part.id}
              joined={userJoined}
              dimmed={full && status === "open" && !userJoined}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={`text-sm font-bold ${userJoined ? "text-heading" : "text-txt"}`}
                  >
                    {part.name}
                  </p>
                  {userJoined && (
                    <span className="inline-flex rounded-md border-2 border-green/50 bg-green/20 px-2 py-0.5 text-[10px] font-bold tracking-wide text-green">
                      参加中
                    </span>
                  )}
                </div>
                <p
                  className={`mt-0.5 text-[11px] ${userJoined ? "text-txt-2" : "text-txt-muted"}`}
                >
                  ¥{part.fee_estimate.toLocaleString()}・{part.joinedCount}/
                  {part.capacity}名
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {full && status === "open" && !userJoined && (
                  <StatusBadge status="closed" />
                )}
                {showJoin && (
                  <Button
                    className="min-w-[4.5rem] px-3 py-2 text-[11px]"
                    disabled={busy === part.id}
                    onClick={() => handleJoin(part.id)}
                  >
                    参加する
                  </Button>
                )}
                {userJoined && !showCancel && (
                  <span className="text-xs font-bold text-green">参加済</span>
                )}
                {showCancel && (
                  <Button
                    variant="outline"
                    className="min-w-[4.5rem] border-green/45 px-3 py-2 text-[11px] text-green hover:border-green/70"
                    disabled={busy === part.id}
                    onClick={() => handleCancel(part.id)}
                  >
                    取り消す
                  </Button>
                )}
                {full && !userJoined && status === "open" && (
                  <Button variant="disabled" className="text-[10px]">
                    満員
                  </Button>
                )}
              </div>
            </PartActionRow>
          );
        })}
      </div>

      {joinedAny && (
        <div className="rounded-[var(--radius-card)] border border-brass/20 bg-card-2/35 px-3 py-2.5">
          <SectionTitle>あなたの会費（見込み）</SectionTitle>
          <p className="mt-1.5 font-display text-lg font-semibold tracking-wide text-heading">
            ¥{feeEstimate.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-txt-muted">
            開催後に企画者が精算し、最終金額が確定します。
          </p>
        </div>
      )}

      {showParticipantsBlock && (
        <>
          <SectionHeader
            title="参加者"
            caption="各パートの参加メンバー一覧"
          />

          <div className="rounded-[var(--radius-card)] border border-line bg-card px-3 py-1.5">
            {parts.map((part, partIndex) => {
              const partPeople = participations.filter(
                (p) => p.event_part_id === part.id,
              );
              const partUserIds = new Set(partPeople.map((p) => p.user_id));
              const addableProfiles = memberProfiles.filter(
                (p) => !partUserIds.has(p.id),
              );
              const partFull = isPartFull(part);
              if (partPeople.length === 0 && !canManage) return null;

              return (
                <div
                  key={`people-${part.id}`}
                  className={
                    partIndex > 0 ? "mt-2 border-t border-line/60 pt-2" : ""
                  }
                >
                  <p className="mb-1.5 font-display text-xs font-semibold tracking-[0.14em] text-brass/90">
                    {part.name}
                  </p>
                  {partPeople.length === 0 ? (
                    <p className="py-1.5 text-[11px] text-txt-muted">
                      まだ参加者がいません
                    </p>
                  ) : (
                    partPeople.map((p) => (
                      <ParticipantRow key={p.id}>
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            nickname={p.nickname}
                            avatarUrl={p.avatarUrl}
                            className="h-[22px] w-[22px] bg-[#5D6B89] text-[10px] font-bold text-txt"
                          />
                          <span className="text-xs text-txt">{p.nickname}</span>
                          {p.user_id === event.organizer_id && (
                            <RoleChip label="企画者" />
                          )}
                          {finalizerId && p.user_id === finalizerId && (
                            <RoleChip label="立替者" />
                          )}
                        </div>
                        {canManage && p.user_id !== event.organizer_id && (
                          <button
                            type="button"
                            className="text-[11px] text-txt-muted hover:text-red-400"
                            disabled={busy === p.id}
                            onClick={() =>
                              handleOrganizerRemove(p.id, part.id)
                            }
                          >
                            外す
                          </button>
                        )}
                      </ParticipantRow>
                    ))
                  )}
                  {canManage && partFull && (
                    <p className="py-1.5 text-[10px] text-txt-muted">
                      定員に達しているため追加できません
                    </p>
                  )}
                  {canManage && !partFull && addableProfiles.length > 0 && (
                    <div className="mt-1 flex gap-2 py-1.5">
                      <select
                        className={selectClass}
                        value={addUserByPart[part.id] ?? ""}
                        onChange={(e) =>
                          setAddUserByPart((prev) => ({
                            ...prev,
                            [part.id]: e.target.value,
                          }))
                        }
                      >
                        <option value="">メンバーを追加…</option>
                        {addableProfiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nickname}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="outline"
                        className="shrink-0 text-[11px]"
                        disabled={
                          !addUserByPart[part.id] ||
                          busy === `add-${part.id}-${addUserByPart[part.id]}`
                        }
                        onClick={() =>
                          handleOrganizerAdd(
                            addUserByPart[part.id] ?? "",
                            part.id,
                          )
                        }
                      >
                        追加
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {canSetFinalizer && (
        <div className="flex flex-col gap-2">
          <SectionHeader
            title="立替者"
            caption="精算担当（一次会の参加者から指定）"
          />

          <div className="rounded-[var(--radius-card)] border border-brass/25 border-l-[3px] border-l-brass bg-card-2/55 px-3 py-3">
            {finalizerId && !firstPartParticipantIds.has(finalizerId) && (
              <p className="mb-2 text-[11px] text-amber-400">
                現在の立替者は一次会に参加していません。「未設定」に変更できます。
              </p>
            )}
            {firstPartParticipantOptions.length === 0 ? (
              <p className="text-[11px] text-txt-muted">
                一次会の参加者がいません
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-txt-2">
                  精算担当メンバー
                </label>
                <div className="flex items-center gap-2">
                  <select
                    className={selectClass}
                    value={finalizerDraft}
                    onChange={(e) => setFinalizerDraft(e.target.value)}
                  >
                    <option value="">未設定</option>
                    {firstPartParticipantOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nickname}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    className="shrink-0 px-3 text-[11px]"
                    disabled={
                      busy === "finalizer" ||
                      finalizerDraft === (finalizerId ?? "")
                    }
                    onClick={handleSaveFinalizer}
                  >
                    保存
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <CommentSection
        eventId={event.id}
        profile={profile}
        comments={comments}
        onCommentsChange={setComments}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

function SectionHeader({
  title,
  caption,
}: {
  title: string;
  caption: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <SectionTitle>{title}</SectionTitle>
      <p className="text-[10px] leading-relaxed text-txt-muted">{caption}</p>
    </div>
  );
}

function RoleChip({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-lg border border-brass/40 bg-brass/15 px-1.5 py-0.5 text-[9px] font-bold text-brass">
      {label}
    </span>
  );
}

function PartActionRow({
  children,
  joined,
  dimmed,
}: {
  children: ReactNode;
  joined: boolean;
  dimmed?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-[10px] border px-3 py-2.5 ${
        joined
          ? "border-2 border-green/55 bg-green/[0.08]"
          : dimmed
            ? "border-line bg-card opacity-75"
            : "border-line bg-card"
      }`}
    >
      {children}
    </div>
  );
}

function ParticipantRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-dashed border-line/70 py-2 last:border-b-0">
      {children}
    </div>
  );
}

function CommentSection({
  eventId,
  profile,
  comments,
  onCommentsChange,
}: {
  eventId: string;
  profile: AppProfile;
  comments: CommentRow[];
  onCommentsChange: (c: CommentRow[]) => void;
}) {
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handlePost() {
    if (!body.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("comments")
      .insert({ event_id: eventId, user_id: profile.id, body: body.trim() })
      .select("id, body, user_id, created_at, updated_at")
      .single();

    setBusy(false);
    if (error || !data) return;

    onCommentsChange([
      ...comments,
      {
        ...data,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
      },
    ]);
    setBody("");
  }

  async function handleUpdate(commentId: string) {
    if (!editBody.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("comments")
      .update({ body: editBody.trim(), updated_at: new Date().toISOString() })
      .eq("id", commentId)
      .select("id, body, user_id, created_at, updated_at")
      .single();

    setBusy(false);
    if (error || !data) return;

    onCommentsChange(
      comments.map((c) =>
        c.id === commentId
          ? { ...c, body: data.body, updated_at: data.updated_at }
          : c,
      ),
    );
    setEditingId(null);
    setMenuId(null);
  }

  async function handleDelete(commentId: string) {
    if (!confirm("コメントを削除しますか？")) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("comments").delete().eq("id", commentId);
    setBusy(false);
    onCommentsChange(comments.filter((c) => c.id !== commentId));
    setMenuId(null);
  }

  const inputClass =
    "flex-1 rounded-[var(--radius-input)] border border-line bg-card-2 px-3 py-2 text-sm text-txt outline-none focus:border-brass/50";

  return (
    <>
      <SectionTitle>コメント</SectionTitle>
      <Card className="flex flex-col gap-2">
        {comments.length === 0 ? (
          <p className="text-sm text-txt-muted">まだコメントがありません</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <UserAvatar
                nickname={c.nickname}
                avatarUrl={c.avatarUrl}
                className="h-6 w-6 bg-card-2 text-[10px] font-bold"
              />
              <div className="min-w-0 flex-1">
                {editingId === c.id ? (
                  <div className="flex gap-2">
                    <input
                      className={inputClass}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                    />
                    <Button
                      className="shrink-0 text-[10px]"
                      disabled={busy}
                      onClick={() => handleUpdate(c.id)}
                    >
                      保存
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-txt">
                    <span className="text-txt-muted">{c.nickname}：</span>
                    {c.body}
                  </p>
                )}
              </div>
              {(c.user_id === profile.id || profile.role === "admin") && (
                <div className="relative">
                  <button
                    type="button"
                    className="text-txt-muted hover:text-txt"
                    onClick={() =>
                      setMenuId(menuId === c.id ? null : c.id)
                    }
                  >
                    ⋯
                  </button>
                  {menuId === c.id && (
                    <div className="absolute right-0 z-10 mt-1 rounded border border-line bg-card py-1 shadow-lg">
                      {c.user_id === profile.id && (
                        <button
                          type="button"
                          className="block w-full px-3 py-1 text-left text-xs hover:bg-card-2"
                          onClick={() => {
                            setEditingId(c.id);
                            setEditBody(c.body);
                            setMenuId(null);
                          }}
                        >
                          編集
                        </button>
                      )}
                      <button
                        type="button"
                        className="block w-full px-3 py-1 text-left text-xs text-[#E8694F] hover:bg-shu/10"
                        onClick={() => handleDelete(c.id)}
                      >
                        削除
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </Card>
      <div className="flex gap-2">
        <input
          className={inputClass}
          placeholder="コメントを書く…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handlePost();
            }
          }}
        />
        <Button
          variant="outline"
          className="shrink-0"
          disabled={busy || !body.trim()}
          onClick={handlePost}
        >
          送信
        </Button>
      </div>
    </>
  );
}
