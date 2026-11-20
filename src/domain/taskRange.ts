import type { InkprintSettings } from "../settings/defaults";

export type TaskRange = "week" | "month" | "all";

interface TaskRangeItem {
  date: string;
  dueDate?: string;
}

export function filterTasksByRange<T extends TaskRangeItem>(
  items: readonly T[],
  range: TaskRange,
  today: string,
  weekStartsOn: InkprintSettings["weekStartsOn"],
): T[] {
  if (range === "all") return [...items];
  const bounds =
    range === "week" ? weekBounds(today, weekStartsOn) : monthBounds(today);
  return items.filter((item) => {
    const anchor = item.dueDate ?? item.date;
    return anchor >= bounds.start && anchor <= bounds.end;
  });
}

function weekBounds(
  today: string,
  weekStartsOn: InkprintSettings["weekStartsOn"],
): { start: string; end: string } {
  const date = parseDate(today);
  const day = date.getDay();
  const offset = weekStartsOn === "monday" ? (day + 6) % 7 : day;
  return {
    start: isoDate(addDays(date, -offset)),
    end: isoDate(addDays(date, 6 - offset)),
  };
}

function monthBounds(today: string): { start: string; end: string } {
  const date = parseDate(today);
  return {
    start: isoDate(new Date(date.getFullYear(), date.getMonth(), 1, 12)),
    end: isoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0, 12)),
  };
}

function parseDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isoDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
