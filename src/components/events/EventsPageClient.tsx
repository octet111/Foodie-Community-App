"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { EventListItem } from "@/lib/events-data";
import { dateKeyInJst, getCalendarCells } from "@/lib/event-dates";
import { EventCard } from "@/components/events/EventCard";
import { Button } from "@/components/ui/Button";

type ViewMode = "list" | "calendar";

type EventsPageClientProps = {
  events: EventListItem[];
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function EventsPageClient({ events }: EventsPageClientProps) {
  const [view, setView] = useState<ViewMode>("list");
  const [openOnly, setOpenOnly] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = events;
    if (openOnly) list = list.filter((e) => e.status === "open");
    if (view === "calendar" && selectedDate) {
      list = list.filter((e) => dateKeyInJst(e.held_at) === selectedDate);
    }
    return list;
  }, [events, openOnly, view, selectedDate]);

  const eventDates = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) set.add(dateKeyInJst(e.held_at));
    return set;
  }, [events]);

  const cells = getCalendarCells(calendarMonth.year, calendarMonth.month);

  function prevMonth() {
    setCalendarMonth((m) => {
      const d = new Date(m.year, m.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
    setSelectedDate(null);
  }

  function nextMonth() {
    setCalendarMonth((m) => {
      const d = new Date(m.year, m.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
    setSelectedDate(null);
  }

  function dateKey(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  return (
    <div className="flex flex-col gap-3">
      <Link href="/events/new">
        <Button className="w-full">＋ 企画を作成</Button>
      </Link>

      <div className="flex rounded-[var(--radius-btn)] border border-line bg-card p-0.5">
        <button
          type="button"
          className={`flex-1 rounded-md py-1.5 text-xs font-bold ${
            view === "list" ? "bg-card-2 text-txt" : "text-txt-muted"
          }`}
          onClick={() => {
            setView("list");
            setSelectedDate(null);
          }}
        >
          リスト
        </button>
        <button
          type="button"
          className={`flex-1 rounded-md py-1.5 text-xs font-bold ${
            view === "calendar" ? "bg-card-2 text-txt" : "text-txt-muted"
          }`}
          onClick={() => setView("calendar")}
        >
          カレンダー
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-txt-muted">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={openOnly}
            onChange={(e) => setOpenOnly(e.target.checked)}
          />
          募集中のみ表示
        </label>
        <span>開催日順</span>
      </div>

      {view === "calendar" && (
        <div className="rounded-[var(--radius-card)] border border-line bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className="text-xs text-brass"
              onClick={prevMonth}
            >
              ‹
            </button>
            <span className="text-sm font-bold text-txt">
              {calendarMonth.year}年{calendarMonth.month + 1}月
            </span>
            <button
              type="button"
              className="text-xs text-brass"
              onClick={nextMonth}
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-txt-muted">
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={`empty-${i}`} />;
              const key = dateKey(d);
              const hasEvent = eventDates.has(key);
              const selected = selectedDate === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`relative rounded-md py-1.5 text-xs ${
                    selected
                      ? "bg-brass/20 font-bold text-brass"
                      : "hover:bg-card-2"
                  }`}
                  onClick={() =>
                    setSelectedDate(selected ? null : key)
                  }
                >
                  {d.getDate()}
                  {hasEvent && (
                    <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brass" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-txt-muted">
          {openOnly ? "募集中の企画はありません" : "企画がまだありません"}
        </p>
      ) : (
        filtered.map((event) => <EventCard key={event.id} event={event} />)
      )}
    </div>
  );
}
