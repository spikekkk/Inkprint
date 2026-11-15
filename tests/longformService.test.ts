import { describe, expect, it, vi } from "vitest";
import type { Vault } from "obsidian";
import { LongformService } from "../src/services/LongformService";

describe("LongformService", () => {
  it("creates a Markdown document with source metadata and a stable block", async () => {
    const create = vi.fn(async (_path: string, _data: string) => ({
      path: "Longform/为什么我想重做每日记录.md",
    }));
    const vault = {
      getFileByPath: vi.fn(() => null),
      getAbstractFileByPath: vi.fn(() => null),
      createFolder: vi.fn(async () => undefined),
      create,
    } as unknown as Vault;
    const service = new LongformService(vault, { longformFolder: "Longform" });

    const result = await service.create({
      title: "为什么我想重做每日记录",
      body: "真正有用的记录，不需要先填完一张表。",
      sourceEntryId: "entry-20261115-101500-a1b2",
      journalDay: "2026-11-15",
    });

    expect(create).toHaveBeenCalledWith(
      "Longform/为什么我想重做每日记录.md",
      expect.stringContaining("source-entry-id: entry-20261115-101500-a1b2"),
    );
    expect(create.mock.calls[0]?.[1]).toContain("^source");
    expect(result.link).toBe(
      "[[Longform/为什么我想重做每日记录#^source|为什么我想重做每日记录]]",
    );
  });

  it("returns an empty-body error before writing", async () => {
    const create = vi.fn();
    const vault = { create } as unknown as Vault;
    const service = new LongformService(vault, { longformFolder: "Longform" });

    await expect(
      service.create({
        title: "标题",
        body: " ",
        sourceEntryId: "entry-source",
        journalDay: "2026-11-15",
      }),
    ).rejects.toThrow("empty");
    expect(create).not.toHaveBeenCalled();
  });
});
