const JST = "Asia/Tokyo";

export function formatHeldAt(heldAt: string): string {
  const d = new Date(heldAt);
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST,
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${get("month")}/${get("day")}（${get("weekday")}）${get("hour")}:${get("minute")}`;
}

export function dateKeyInJst(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: JST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function isoToLocalDatetime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localDatetimeToIso(value: string): string {
  return new Date(value).toISOString();
}

export const EVENT_HELD_AT_STEP_MINUTES = 10;
export const EVENT_HELD_AT_STEP_SECONDS = EVENT_HELD_AT_STEP_MINUTES * 60;

/** 開催日時の時刻選択肢（10分刻み 00:00〜23:50） */
export const EVENT_HELD_AT_TIME_OPTIONS = Array.from({ length: 24 * 6 }, (_, i) => {
  const hour = Math.floor(i / 6);
  const minute = (i % 6) * EVENT_HELD_AT_STEP_MINUTES;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

export function roundTimeToStep(
  time: string,
  stepMinutes = EVENT_HELD_AT_STEP_MINUTES,
): string {
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return EVENT_HELD_AT_TIME_OPTIONS[0];
  }

  const totalMinutes = hour * 60 + minute;
  const rounded = Math.round(totalMinutes / stepMinutes) * stepMinutes;
  const clamped = Math.min(Math.max(rounded, 0), 23 * 60 + 50);
  const roundedHour = Math.floor(clamped / 60);
  const roundedMinute = clamped % 60;
  return `${String(roundedHour).padStart(2, "0")}:${String(roundedMinute).padStart(2, "0")}`;
}

export function splitLocalDatetime(value: string): {
  date: string;
  time: string;
} {
  if (!value) {
    return { date: "", time: EVENT_HELD_AT_TIME_OPTIONS[0] };
  }

  const [date, timePart = ""] = value.split("T");
  const [hour = "00", minute = "00"] = timePart.split(":");
  return {
    date,
    time: timePart ? roundTimeToStep(`${hour}:${minute}`) : EVENT_HELD_AT_TIME_OPTIONS[0],
  };
}

export function combineLocalDatetime(date: string, time: string): string {
  if (!date || !time) return "";
  return `${date}T${time}`;
}

export function isoToHeldAtFields(iso: string): { date: string; time: string } {
  return splitLocalDatetime(isoToLocalDatetime(iso));
}

export function roundLocalDatetimeToStep(
  value: string,
  stepMinutes = EVENT_HELD_AT_STEP_MINUTES,
): string {
  if (!value) return value;
  const { date, time } = splitLocalDatetime(value);
  return combineLocalDatetime(date, roundTimeToStep(time, stepMinutes));
}

export function getCalendarCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];

  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  return cells;
}
