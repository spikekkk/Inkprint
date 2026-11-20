import { describe, expect, it } from "vitest";
import { summarizeTasks } from "../src/domain/taskSummary";

describe("summarizeTasks", () => {
  it("summarizes pending, due today, overdue, scheduled and completed tasks", () => {
    const summary = summarizeTasks(
      [
        { lineIndex: 0, checked: false, text: "散步", date: "2026-11-20", filePath: "Daily/2026-11-20.md" },
        {
          lineIndex: 1,
          checked: false,
          text: "交稿",
          dueDate: "2026-11-20",
          date: "2026-11-18",
          filePath: "Daily/2026-11-18.md",
        },
        {
          lineIndex: 2,
          checked: false,
          text: "复盘",
          dueDate: "2026-11-19",
          date: "2026-11-18",
          filePath: "Daily/2026-11-18.md",
        },
        {
          lineIndex: 3,
          checked: false,
          text: "读书",
          dueDate: "2026-11-26",
          date: "2026-11-20",
          filePath: "Daily/2026-11-20.md",
        },
        { lineIndex: 4, checked: true, text: "拉伸", date: "2026-11-20", filePath: "Daily/2026-11-20.md" },
      ],
      "2026-11-20",
    );

    expect(summary).toEqual({
      total: 5,
      pending: 4,
      completed: 1,
      completionRate: 20,
      dueToday: 1,
      overdue: 1,
      scheduled: 3,
      regular: 1,
    });
  });

  it("returns a zero completion rate when there are no tasks", () => {
    expect(summarizeTasks([], "2026-11-20")).toMatchObject({
      total: 0,
      pending: 0,
      completed: 0,
      completionRate: 0,
    });
  });
});
