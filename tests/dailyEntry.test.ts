import { describe, expect, it } from "vitest";
import { createEntryId, parseDailyEntries, serializeDailyEntry } from "../src/domain/dailyEntry";

describe("daily entry", () => {
  it("creates stable local-time entry IDs", () => {
    expect(createEntryId(new Date(2026, 10, 15, 10, 15, 9), "a1b2")).toBe(
      "entry-20261115-101509-a1b2",
    );
  });

  it("serializes body, tags, metadata, and a block ID", () => {
    const markdown = serializeDailyEntry({
      entryId: "entry-20261115-101500-a1b2",
      createdAt: "2026-11-15T10:15:00+08:00",
      body: "今天先写下一句话。\n第二行继续。",
      tags: ["此刻的心情", "#产品设计"],
      taskId: "organize-goals",
    });

    expect(markdown).toContain("- 10:15 #此刻的心情 #产品设计");
    expect(markdown).toContain("  今天先写下一句话。\n  第二行继续。");
    expect(markdown).toContain('"taskId":"organize-goals"');
    expect(markdown).toContain("^entry-20261115-101500-a1b2");
  });

  it("parses entries written by the plugin", () => {
    const markdown = [
      "## 记录",
      "",
      serializeDailyEntry({
        entryId: "entry-20261115-101500-a1b2",
        createdAt: "2026-11-15T10:15:00+08:00",
        body: "今天先写下一句话。",
        tags: ["此刻的心情"],
      }).trimEnd(),
    ].join("\n");

    expect(parseDailyEntries(markdown)).toEqual([
      expect.objectContaining({
        entryId: "entry-20261115-101500-a1b2",
        createdAt: "2026-11-15T10:15:00+08:00",
        body: "今天先写下一句话。",
        tags: ["此刻的心情"],
      }),
    ]);
  });
});
