import { describe, expect, it, vi } from "vitest";
import { serializeDailyEntry } from "../src/domain/dailyEntry";
import { CheckinService } from "../src/services/CheckinService";

describe("CheckinService", () => {
  it("uses the latest Daily event as the task state", async () => {
    const markdown = [
      serializeDailyEntry({
        entryId: "entry-1",
        createdAt: "2026-11-15T08:00:00+08:00",
        body: "完成任务：整理目标结构",
        tags: ["打卡"],
        kind: "task",
        taskId: "task-organize",
        event: "completed",
      }),
      serializeDailyEntry({
        entryId: "entry-2",
        createdAt: "2026-11-15T09:00:00+08:00",
        body: "取消完成任务：整理目标结构",
        tags: ["打卡"],
        kind: "task",
        taskId: "task-organize",
        event: "reopened",
      }),
    ].join("\n");
    const daily = {
      read: vi.fn(async () => markdown),
      append: vi.fn(),
    };
    const service = new CheckinService(daily as never);

    expect([...(await service.getCompletedTaskIds("2026-11-15"))]).toEqual([]);
  });

  it("writes completion events to Daily instead of the goal tree", async () => {
    const append = vi.fn(async () => undefined);
    const service = new CheckinService({ append, read: vi.fn() } as never);

    await service.setTaskDone(
      "2026-11-15",
      {
        id: "task-organize",
        parentId: null,
        title: "整理目标结构",
        kind: "task",
        progressMode: "manual",
        done: false,
        archived: false,
      },
      true,
    );

    expect(append).toHaveBeenCalledWith(
      "2026-11-15",
      expect.objectContaining({
        taskId: "task-organize",
        event: "completed",
        kind: "task",
      }),
    );
  });
});
