import { describe, expect, it } from "vitest";
import {
  buildStatsSeries,
  summarizeEntries,
  type StatsEntry,
} from "../src/services/StatsService";

const entries: StatsEntry[] = [
  {
    date: "2026-11-18",
    body: "今天记录了一个想法。",
    tags: ["产品设计"],
  },
  {
    date: "2026-11-19",
    body: "Second note with three words.",
    tags: ["产品设计", "生活"],
  },
  {
    date: "2026-11-19",
    body: "继续写。",
    tags: [],
  },
];

describe("StatsService", () => {
  it("summarizes notes, days, words, and tags", () => {
    const summary = summarizeEntries(entries);
    expect(summary.noteCount).toBe(3);
    expect(summary.dayCount).toBe(2);
    expect(summary.tagCount).toBe(2);
    expect(summary.wordCount).toBeGreaterThan(10);
    expect(summary.tags[0]).toEqual({ name: "产品设计", count: 2 });
  });

  it("builds daily bars for a month", () => {
    const series = buildStatsSeries(entries, "month", "2026-11-19");
    expect(series).toHaveLength(30);
    expect(series.find((bar) => bar.key === "2026-11-19")?.count).toBe(2);
  });

  it("builds monthly bars for a year", () => {
    const series = buildStatsSeries(entries, "year", "2026-11-19");
    expect(series).toHaveLength(12);
    expect(series[10]?.count).toBe(3);
  });
});
