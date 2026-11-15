import { parseDailyEntries } from "../domain/dailyEntry";
import { createEntryId, createRandomSuffix } from "../domain/ids";
import type { GoalNode } from "../domain/goalTree";
import type { DailyNoteService } from "./DailyNoteService";

export class CheckinService {
  constructor(private readonly daily: DailyNoteService) {}

  async setTaskDone(day: string, task: GoalNode, done: boolean): Promise<void> {
    const now = new Date();
    const entryId = createEntryId(now, createRandomSuffix());
    await this.daily.append(day, {
      entryId,
      createdAt: localTimestamp(now),
      body: `${done ? "完成" : "取消完成"}任务：${task.title}`,
      tags: ["打卡"],
      kind: "task",
      taskId: task.id,
      event: done ? "completed" : "reopened",
    });
  }

  async getCompletedTaskIds(day: string): Promise<Set<string>> {
    const entries = parseDailyEntries(await this.daily.read(day))
      .filter((entry) => entry.kind === "task" && entry.taskId)
      .sort((first, second) => first.createdAt.localeCompare(second.createdAt));
    const completed = new Set<string>();
    for (const entry of entries) {
      if (!entry.taskId) continue;
      if (entry.event === "completed") completed.add(entry.taskId);
      if (entry.event === "reopened") completed.delete(entry.taskId);
    }
    return completed;
  }
}

function localTimestamp(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(offsetMinutes) % 60).padStart(2, "0");
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 19);
  return `${local}${sign}${hours}:${minutes}`;
}
