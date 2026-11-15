import { describe, expect, it } from "vitest";
import { CalendarMonth } from "../src/ui/CalendarMonth";

describe("CalendarMonth", () => {
  it("builds a Monday-first six-week calendar", () => {
    const days = CalendarMonth.build(2026, 10);
    expect(days).toHaveLength(42);
    expect(days[0]).toMatchObject({
      key: "2026-10-26",
      day: 26,
      inCurrentMonth: false,
    });
    expect(days.find((day) => day.key === "2026-11-14")).toMatchObject({
      inCurrentMonth: true,
      day: 14,
    });
  });

  it("supports Sunday-first calendars", () => {
    const days = CalendarMonth.build(2026, 10, "sunday");
    expect(days[0]?.key).toBe("2026-11-01");
  });
});
