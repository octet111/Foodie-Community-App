const JST = "Asia/Tokyo";

/** 企画公開時に生成するリマインド時刻（4日前18:00・当日9:00 JST） */
export function buildReminderTimes(heldAtIso: string): {
  dayBefore18: string;
  dayOf9: string;
} {
  const heldAt = new Date(heldAtIso);

  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: JST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(heldAt);

  const [y, m, d] = dateKey.split("-").map(Number);
  const heldJst = new Date(Date.UTC(y, m - 1, d));
  const dayBefore = new Date(heldJst);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);

  const pad = (n: number) => String(n).padStart(2, "0");
  const beforeKey = `${dayBefore.getUTCFullYear()}-${pad(dayBefore.getUTCMonth() + 1)}-${pad(dayBefore.getUTCDate())}`;

  const dayBefore18 = new Date(`${beforeKey}T18:00:00+09:00`).toISOString();
  const dayOf9 = new Date(`${dateKey}T09:00:00+09:00`).toISOString();

  return { dayBefore18, dayOf9 };
}
