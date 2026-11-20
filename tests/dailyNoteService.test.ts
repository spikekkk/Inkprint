import { describe, expect, it, vi } from "vitest";
import type { Vault } from "obsidian";
import { DailyNoteService } from "../src/services/DailyNoteService";
import { serializeDailyEntry } from "../src/domain/dailyEntry";

describe("DailyNoteService", () => {
  it("creates the Daily note and appends an atomic entry", async () => {
    const createdFile = { path: "Daily/2026-11-15.md" };
    const create = vi.fn(async () => createdFile);
    const append = vi.fn(async () => undefined);
    const createFolder = vi.fn(async () => undefined);
    const vault = {
      getFileByPath: vi.fn(() => null),
      getAbstractFileByPath: vi.fn(() => null),
      createFolder,
      create,
      append,
    } as unknown as Vault;

    const service = new DailyNoteService(vault, {
      dailyFolder: "Daily",
      dailyHeading: "## 记录",
    });
    const entry = await service.append("2026-11-15", {
      entryId: "entry-20261115-101500-a1b2",
      createdAt: "2026-11-15T10:15:00+08:00",
      body: "今天先写下一句话。",
      tags: ["此刻的心情"],
    });

    expect(createFolder).toHaveBeenCalledWith("Daily");
    expect(create).toHaveBeenCalledWith("Daily/2026-11-15.md", "## 记录\n\n");
    expect(append).toHaveBeenCalledWith(
      createdFile,
      expect.stringContaining("^entry-20261115-101500-a1b2"),
    );
    expect(entry.blockId).toBe("entry-20261115-101500-a1b2");
  });

  it("does not append empty entries", async () => {
    const vault = {} as Vault;
    const service = new DailyNoteService(vault, {
      dailyFolder: "Daily",
      dailyHeading: "## 记录",
    });

    await expect(
      service.append("2026-11-15", {
        entryId: "entry-empty",
        createdAt: "2026-11-15T10:15:00+08:00",
        body: "   ",
        tags: [],
      }),
    ).rejects.toThrow("empty");
  });

  it("updates an existing entry in place while preserving its block id", async () => {
    const markdown = serializeDailyEntry({
      entryId: "entry-20261121-101500-a1b2",
      createdAt: "2026-11-21T10:15:00+08:00",
      body: "旧内容",
      tags: ["旧标签"],
    });
    const file = { path: "Daily/2026-11-21.md" };
    const process = vi.fn(async (_file, update: (value: string) => string) => update(markdown));
    const vault = {
      getFileByPath: vi.fn(() => file),
      process,
    } as unknown as Vault;
    const service = new DailyNoteService(vault, {
      dailyFolder: "Daily",
      dailyHeading: "## 记录",
    });

    const entry = await service.update(
      "2026-11-21",
      "entry-20261121-101500-a1b2",
      "更新后的内容 #新标签",
    );

    expect(process).toHaveBeenCalledWith(file, expect.any(Function));
    expect(entry).toEqual(
      expect.objectContaining({
        entryId: "entry-20261121-101500-a1b2",
        createdAt: "2026-11-21T10:15:00+08:00",
        editedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/),
        body: "更新后的内容 #新标签",
        tags: ["新标签"],
      }),
    );
  });
});
