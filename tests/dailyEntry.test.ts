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

  it("recognizes plain Thino and Knomo style entries without rewriting them", () => {
    const markdown = [
      "## Journal",
      "",
      "- 09:15 这是 Thino 记录 #灵感",
      "  第二行也属于同一条记录。",
      "- 10:20:30 来自 Knomo 的记录",
    ].join("\n");

    expect(
      parseDailyEntries(markdown, { dateKey: "2026-11-21" }),
    ).toEqual([
      expect.objectContaining({
        createdAt: "2026-11-21T09:15:00",
        body: "这是 Thino 记录 #灵感\n第二行也属于同一条记录。",
        tags: ["灵感"],
        source: "legacy",
      }),
      expect.objectContaining({
        createdAt: "2026-11-21T10:20:30",
        body: "来自 Knomo 的记录",
        source: "legacy",
      }),
    ]);
  });

  it("recognizes Thino checkbox entries and ignores code examples", () => {
    const markdown = [
      "- [ ] 19:00 整理旧日记",
      "```md",
      "- 20:00 这不是一条真实记录",
      "```",
    ].join("\n");
    const entries = parseDailyEntries(markdown, { dateKey: "2026-11-21" });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(
      expect.objectContaining({
        createdAt: "2026-11-21T19:00:00",
        body: "- [ ] 整理旧日记",
        source: "legacy",
      }),
    );
  });

  it("does not double count an Inkprint entry as legacy", () => {
    const markdown = serializeDailyEntry({
      entryId: "entry-20261121-101500-a1b2",
      createdAt: "2026-11-21T10:15:00+08:00",
      body: "Inkprint 记录",
      tags: [],
    });
    const entries = parseDailyEntries(markdown, { dateKey: "2026-11-21" });

    expect(entries).toHaveLength(1);
    expect(entries[0].source).toBe("inkprint");
  });

  it("round-trips the last edited time without changing the original time", () => {
    const markdown = serializeDailyEntry({
      entryId: "entry-20261121-101500-a1b2",
      createdAt: "2026-11-21T10:15:00+08:00",
      editedAt: "2026-11-21T11:42:00+08:00",
      body: "编辑后的内容",
      tags: [],
    });
    const [entry] = parseDailyEntries(markdown, { dateKey: "2026-11-21" });

    expect(entry.createdAt).toBe("2026-11-21T10:15:00+08:00");
    expect(entry.editedAt).toBe("2026-11-21T11:42:00+08:00");
  });
});
