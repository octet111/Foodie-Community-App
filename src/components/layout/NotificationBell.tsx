"use client";

import { useEffect, useRef, useState } from "react";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",
    title: "明日の企画リマインド",
    body: "鮨かね田を貸切る会 — 6/27（土）18:00",
    createdAt: "2026-06-14T18:00:00+09:00",
    read: false,
  },
  {
    id: "2",
    title: "参加表明のお知らせ",
    body: "まりさんが「町中華で紹興酒の夜」に参加しました",
    createdAt: "2026-06-13T10:30:00+09:00",
    read: false,
  },
  {
    id: "3",
    title: "精算のお知らせ",
    body: "春の天ぷらの会 — 請求額 ¥6,200",
    createdAt: "2026-06-10T09:00:00+09:00",
    read: true,
  },
];

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(INITIAL_NOTIFICATIONS);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = items.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleToggle() {
    setOpen((wasOpen) => {
      const next = !wasOpen;
      if (next) {
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      }
      return next;
    });
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label="通知"
        aria-expanded={open}
        onClick={handleToggle}
        className="relative flex h-[22px] w-[22px] items-end justify-center rounded-full rounded-b-sm border-[1.5px] border-txt-2 pb-0.5"
      >
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[16px] rounded-lg bg-shu px-1 text-center text-[9px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 w-72 overflow-hidden rounded-[var(--radius-card)] border border-line bg-card-2 shadow-lg">
          <div className="border-b border-line px-3 py-2">
            <p className="font-display text-[10px] tracking-[var(--tracking-section)] text-brass">
              通知
            </p>
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-txt-muted">
                通知はありません
              </li>
            ) : (
              items.map((item) => (
                <li
                  key={item.id}
                  className={`border-b border-line/60 px-3 py-2.5 last:border-b-0 ${!item.read ? "bg-brass/5" : ""}`}
                >
                  <p className="text-xs font-bold text-heading">{item.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-txt-2">
                    {item.body}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
