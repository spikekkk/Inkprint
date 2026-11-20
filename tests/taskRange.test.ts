import { describe, expect, it } from "vitest";
import { filterTasksByRange } from "../src/domain/taskRange";

const items = [
  { text: "上周记录", date: "2026-11-15" },
  { text: "本周记录", date: "2026-11-18" },
  {
    text: "本周安排",
    date: "2026-10-20",
    dueDate: "2026-11-20",
  },
  {
    text: "下周安排",
    date: "2026-11-20",
    dueDate: "2026-11-23",
  },
  { text: "本月记录", date: "2026-11-01" },
  { text: "上月记录", date: "2026-10-31" },
];

describe("filterTasksByRange", () => {
  it("filters Monday-started weeks by due date or record date", () => {
    expect(
      filterTasksByRange(items, "week", "2026-11-20", "monday").map((item) => item.text),
    ).toEqual(["本周记录", "本周安排"]);
  });

  it("respects a Sunday-started week", () => {
    expect(
      filterTasksByRange(items, "week", "2026-11-20", "sunday").map((item) => item.text),
    ).toEqual(["上周记录", "本周记录", "本周安排"]);
  });

  it("filters current calendar months", () => {
    expect(
      filterTasksByRange(items, "month", "2026-11-20", "monday").map((item) => item.text),
    ).toEqual(["上周记录", "本周记录", "本周安排", "下周安排", "本月记录"]);
  });

  it("keeps every item in the all range", () => {
    expect(filterTasksByRange(items, "all", "2026-11-20", "monday")).toEqual(items);
  });
});
