"use client";

import {
  EVENT_HELD_AT_STEP_MINUTES,
  EVENT_HELD_AT_TIME_OPTIONS,
} from "@/lib/event-dates";

type EventHeldAtFieldsProps = {
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  idPrefix?: string;
};

const fieldClass =
  "w-full rounded-[var(--radius-input)] border border-line bg-card-2 px-3 py-2 text-sm text-txt outline-none focus:border-brass/50";

export function EventHeldAtFields({
  date,
  time,
  onDateChange,
  onTimeChange,
  idPrefix = "event-held",
}: EventHeldAtFieldsProps) {
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="sr-only">開催日時</legend>
      <div className="flex gap-2">
        <div className="min-w-0 flex-[1.2]">
          <label
            htmlFor={`${idPrefix}-date`}
            className="mb-1 block text-xs text-txt-muted"
          >
            開催日
          </label>
          <input
            id={`${idPrefix}-date`}
            type="date"
            className={fieldClass}
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <label
            htmlFor={`${idPrefix}-time`}
            className="mb-1 block text-xs text-txt-muted"
          >
            開催時刻（{EVENT_HELD_AT_STEP_MINUTES}分単位）
          </label>
          <select
            id={`${idPrefix}-time`}
            className={fieldClass}
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
          >
            {EVENT_HELD_AT_TIME_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
    </fieldset>
  );
}
