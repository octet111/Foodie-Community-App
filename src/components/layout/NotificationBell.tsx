"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  markAllNotificationsRead,
  type NotificationItem,
} from "@/lib/notifications-data";

type NotificationBellProps = {
  initialItems: NotificationItem[];
};

export function NotificationBell({ initialItems }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const unreadCount = initialItems.filter((n) => !n.read).length;

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

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      await markAllNotificationsRead();
      router.refresh();
    }
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
            {initialItems.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-txt-muted">
                通知はありません
              </li>
            ) : (
              initialItems.map((item) => {
                const content = (
                  <>
                    <p className="text-xs font-bold text-heading">{item.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-txt-2">
                      {item.body}
                    </p>
                  </>
                );

                return (
                  <li
                    key={item.id}
                    className={`border-b border-line/60 last:border-b-0 ${!item.read ? "bg-brass/5" : ""}`}
                  >
                    {item.eventId ? (
                      <Link
                        href={`/events/${item.eventId}`}
                        onClick={() => setOpen(false)}
                        className="block px-3 py-2.5 hover:bg-brass/10"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className="px-3 py-2.5">{content}</div>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
