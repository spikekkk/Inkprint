import { describe, expect, it, vi } from "vitest";
import type { Vault } from "obsidian";
import { GoalService } from "../src/services/GoalService";

describe("GoalService", () => {
  it("creates and atomically persists a new goal node", async () => {
    const file = { path: "Goals/目标树.md" };
    let content = "- 内容输出 #okr/objective ^goal-content\n";
    const process = vi.fn(async (_file: unknown, update: (data: string) => string) => {
      content = update(content);
      return content;
    });
    const vault = {
      getFileByPath: vi.fn(() => file),
      getAbstractFileByPath: vi.fn(() => ({ children: [] })),
      cachedRead: vi.fn(async () => content),
      process,
    } as unknown as Vault;
    const service = new GoalService(vault, { goalsPath: "Goals/目标树.md" });

    const created = await service.create("goal-content", {
      title: "完成移动端排版",
      kind: "task",
      schedule: "one-off",
    });

    expect(created.parentId).toBe("goal-content");
    expect(content).toContain("完成移动端排版");
    expect(content).toContain(`^${created.id}`);
    expect(process).toHaveBeenCalledOnce();
  });

  it("archives a node and all of its descendants", async () => {
    let content = [
      "- 内容输出 #okr/objective ^goal-content",
      "  - 建立记录习惯 #okr/key-result ^goal-habit",
      "    - [ ] 整理目标结构 #okr/task ^task-organize",
    ].join("\n");
    const file = { path: "Goals/目标树.md" };
    const vault = {
      getFileByPath: vi.fn(() => file),
      getAbstractFileByPath: vi.fn(() => ({ children: [] })),
      cachedRead: vi.fn(async () => content),
      process: vi.fn(async (_file: unknown, update: (data: string) => string) => {
        content = update(content);
        return content;
      }),
    } as unknown as Vault;
    const service = new GoalService(vault, { goalsPath: "Goals/目标树.md" });

    await service.archive("goal-content");

    expect(content).toContain("[archived:: true]");
    expect(content.match(/\[archived:: true\]/g)).toHaveLength(3);
  });
});
