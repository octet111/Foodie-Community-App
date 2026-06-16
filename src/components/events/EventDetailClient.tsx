"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AppProfile } from "@/lib/app-data";
import type { CommentRow, EventDetail } from "@/lib/events-data";
import { formatHeldAt } from "@/lib/event-dates";
import {
  allPartsFull,
  canCancelPart,
  canJoinPart,
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
import Link from "next/link";

type EventDetailClientProps = {
  event: EventDetail;
  profile: AppProfile;
};

export function EventDetailClient({ event, profile }: EventDetailClientProps) {
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

  const isOrganizer = event.organizer_id === profile.id;
  const isAdmin = profile.role === "admin";
  const joinedAny = myJoinedPartIds.size > 0;
  const feeEstimate = sumFeeEstimate(parts, myJoinedPartIds);

  async function refreshFromServer() {
    router.refresh();
  }

  async function maybeCloseEvent(supabase: ReturnType<typeof createClient>) {
    const { data: freshParts } = await supabase
      .from("event_parts")
      .select("id, capacity, participations(id, status)")
      .eq("event_id", event.id);

    if (!freshParts) return;

    const stats = freshParts.map((p) => ({
      ...p,
      joinedCount: (p.participations ?? []).filter(
        (x: { status: string }) => x.status === "joined",
      ).length,
    }));

    setParts((prev) =>
      prev.map((p) => {
        const fresh = stats.find((s) => s.id === p.id);
        return fresh
          ? { ...p, joinedCount: fresh.joinedCount }
          : p;
      }),
    );

    if (
      allPartsFull(
        stats.map((s) => ({
          id: s.id,
          name: "",
          capacity: s.capacity,
          fee_estimate: 0,
          sort_order: 0,
          joinedCount: s.joinedCount,
        })),
      )
    ) {
      await supabase
        .from("events")
        .update({ status: "closed" })
        .eq("id", event.id);
      setStatus("closed");
    }
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

    await maybeCloseEvent(supabase);
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
    if (!isOrganizer && !isAdmin) return;
    setError(null);
    setBusy(participationId);
    const supabase = createClient();

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
    setParts((prev) =>
      prev.map((p) =>
        p.id === partId ? { ...p, joinedCount: Math.max(0, p.joinedCount - 1) } : p,
      ),
    );
    setBusy(null);
    refreshFromServer();
  }

  async function handleCloseEvent() {
    if (!isOrganizer && !isAdmin) return;
    setBusy("close");
    const supabase = createClient();
    await supabase.from("events").update({ status: "closed" }).eq("id", event.id);
    setStatus("closed");
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
    router.push("/");
    router.refresh();
  }

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
        <p className="text-sm text-txt-muted">
          {formatHeldAt(event.held_at)}
          {event.location ? `〜・${event.location}` : ""}
          {"（"}
          <Link href={`/shops/${event.shop.id}`} className="text-brass underline">
            {event.shop.name}
          </Link>
          {" ↗）"}
          <br />
          企画：{event.organizerNickname}{" "}
          <StatusBadge status={status} />
        </p>
        {event.description && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-txt-2">
            {event.description}
          </p>
        )}
      </Card>

      {(isOrganizer || isAdmin || joinedAny) && (
        <Link href={`/events/${event.id}/settlement`}>
          <Button variant="outline">精算へ</Button>
        </Link>
      )}

      {(isOrganizer || isAdmin) && status === "open" && (
        <div className="flex flex-wrap gap-2">
          <Link href={`/events/${event.id}/edit`}>
            <Button variant="outline">編集</Button>
          </Link>
          <Button variant="outline" disabled={busy === "close"} onClick={handleCloseEvent}>
            締切にする
          </Button>
          <Button variant="outline" disabled={busy === "delete"} onClick={handleDelete}>
            削除
          </Button>
        </div>
      )}

      {(isOrganizer || isAdmin) && status !== "open" && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy === "delete"} onClick={handleDelete}>
            削除
          </Button>
        </div>
      )}

      <SectionTitle>参加パート</SectionTitle>
      {joinedAny && !isOrganizer && (
        <p className="text-sm text-txt-2">
          会費見込み：¥{feeEstimate.toLocaleString()}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {parts.map((part) => {
          const userJoined = myJoinedPartIds.has(part.id);
          const full = isPartFull(part);
          const showJoin = canJoinPart(status, part, userJoined);
          const showCancel = canCancelPart(status, userJoined, isOrganizer);

          return (
            <Card
              key={part.id}
              className="flex items-center justify-between gap-2 py-2"
            >
              <div>
                <p className="text-sm font-bold text-txt">{part.name}</p>
                <p className="text-xs text-txt-muted">
                  ¥{part.fee_estimate.toLocaleString()}・{part.joinedCount}/
                  {part.capacity}名
                </p>
              </div>
              <div className="flex items-center gap-2">
                {full && status === "open" && (
                  <StatusBadge status="closed" />
                )}
                {showJoin && (
                  <Button
                    className="text-[10px]"
                    disabled={busy === part.id}
                    onClick={() => handleJoin(part.id)}
                  >
                    参加する
                  </Button>
                )}
                {userJoined && !showCancel && (
                  <span className="text-xs text-green">参加済</span>
                )}
                {showCancel && (
                  <Button
                    variant="outline"
                    className="text-[10px]"
                    disabled={busy === part.id}
                    onClick={() => handleCancel(part.id)}
                  >
                    取消
                  </Button>
                )}
                {full && !userJoined && status === "open" && (
                  <Button variant="disabled" className="text-[10px]">
                    満員
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {parts.map((part) => {
        const partPeople = participations.filter(
          (p) => p.event_part_id === part.id,
        );
        if (partPeople.length === 0) return null;
        return (
          <div key={`people-${part.id}`}>
            <SectionTitle>参加者（{part.name}）</SectionTitle>
            <Card className="flex flex-col gap-1 py-2">
              {partPeople.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-card-2 text-[10px] font-bold">
                      {p.nickname.charAt(0)}
                    </span>
                    <span className="text-sm text-txt">{p.nickname}</span>
                    {p.user_id === event.organizer_id && (
                      <span className="rounded bg-line px-1.5 py-0.5 text-[10px] text-txt-muted">
                        企画者
                      </span>
                    )}
                  </div>
                  {(isOrganizer || isAdmin) &&
                    p.user_id !== event.organizer_id &&
                    status === "closed" && (
                      <button
                        type="button"
                        className="text-xs text-txt-muted hover:text-red-400"
                        disabled={busy === p.id}
                        onClick={() => handleOrganizerRemove(p.id, part.id)}
                      >
                        外す
                      </button>
                    )}
                </div>
              ))}
            </Card>
          </div>
        );
      })}

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
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card-2 text-[10px] font-bold">
                {c.nickname.charAt(0)}
              </span>
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
                        className="block w-full px-3 py-1 text-left text-xs text-red-400 hover:bg-card-2"
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
