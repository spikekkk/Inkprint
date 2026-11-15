export interface CalendarDay {
  key: string;
  year: number;
  monthIndex: number;
  day: number;
  inCurrentMonth: boolean;
}

export class CalendarMonth {
  static build(
    year: number,
    monthIndex: number,
    weekStartsOn: "monday" | "sunday" = "monday",
  ): CalendarDay[] {
    const first = new Date(year, monthIndex, 1, 12);
    const offset =
      weekStartsOn === "monday" ? (first.getDay() + 6) % 7 : first.getDay();
    const start = new Date(year, monthIndex, 1 - offset, 12);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        key: dateKey(date),
        year: date.getFullYear(),
        monthIndex: date.getMonth(),
        day: date.getDate(),
        inCurrentMonth: date.getMonth() === monthIndex,
      };
    });
  }
}

export function dateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
