import { normalizePath, type Vault } from "obsidian";
import { parseDailyEntries } from "../domain/dailyEntry";

export interface TimeBuoyItem {
  sourceDate: string;
  entryId: string;
  createdAt: string;
  body: string;
  targetDate: string;
}

export class TimeBuoyService {
  constructor(
    private readonly vault: Vault,
    private readonly config: { dailyFolder: string },
  ) {}

  async listForDate(targetDate: string): Promise<TimeBuoyItem[]> {
    const folder = normalizePath(this.config.dailyFolder);
    const files = this.vault
      .getFiles()
      .filter((file) => file.extension === "md" && file.path.startsWith(`${folder}/`));
    const items: TimeBuoyItem[] = [];

    for (const file of files) {
      const entries = parseDailyEntries(await this.vault.cachedRead(file));
      for (const entry of entries) {
        if (!extractTimeBuoyDates(entry.body).includes(targetDate)) continue;
        items.push({
          sourceDate: file.basename,
          entryId: entry.entryId,
          createdAt: entry.createdAt,
          body: entry.body,
          targetDate,
        });
      }
    }
    return items.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  }
}

export function extractTimeBuoyDates(text: string): string[] {
  const dates = new Set<string>();
  for (const match of text.matchAll(/@(\d{4}-\d{2}-\d{2})\b/g)) {
    const date = match[1];
    const parsed = new Date(`${date}T12:00:00`);
    if (!Number.isNaN(parsed.getTime()) && isoDate(parsed) === date) dates.add(date);
  }
  return [...dates];
}

function isoDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
