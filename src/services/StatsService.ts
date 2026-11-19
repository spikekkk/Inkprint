import { normalizePath, type Vault } from "obsidian";
import { parseDailyEntries } from "../domain/dailyEntry";

export type StatsPeriod = "week" | "month" | "year";

export interface StatsEntry {
  date: string;
  body: string;
  tags: string[];
}

export interface StatsSummary {
  noteCount: number;
  dayCount: number;
  wordCount: number;
  tagCount: number;
  tags: Array<{ name: string; count: number }>;
}

export interface StatsBar {
  key: string;
  label: string;
  count: number;
  words: number;
}

export class StatsService {
  constructor(
    private readonly vault: Vault,
    private readonly config: { dailyFolder: string },
  ) {}

  async load(): Promise<StatsEntry[]> {
    const folder = normalizePath(this.config.dailyFolder);
    const files = this.vault
      .getFiles()
      .filter((file) => file.extension === "md" && file.path.startsWith(`${folder}/`));
    const entries: StatsEntry[] = [];

    for (const file of files) {
      const date = file.basename;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      for (const entry of parseDailyEntries(await this.vault.cachedRead(file))) {
        entries.push({ date, body: entry.body, tags: entry.tags });
      }
    }
    return entries;
  }
}

export function summarizeEntries(entries: readonly StatsEntry[]): StatsSummary {
  const tags = new Map<string, number>();
  const days = new Set<string>();
  let wordCount = 0;

  for (const entry of entries) {
    days.add(entry.date);
    wordCount += countWords(entry.body);
    for (const tag of entry.tags) tags.set(tag, (tags.get(tag) ?? 0) + 1);
  }

  return {
    noteCount: entries.length,
    dayCount: days.size,
    wordCount,
    tagCount: tags.size,
    tags: [...tags]
      .map(([name, count]) => ({ name, count }))
      .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name)),
  };
}

export function buildStatsSeries(
  entries: readonly StatsEntry[],
  period: StatsPeriod,
  anchorDate: string,
): StatsBar[] {
  const anchor = new Date(`${anchorDate}T12:00:00`);
  const buckets = new Map<string, StatsBar>();
  const bars = createBuckets(period, anchor);
  bars.forEach((bar) => buckets.set(bar.key, bar));

  for (const entry of entries) {
    const key = bucketKey(period, entry.date);
    const bar = buckets.get(key);
    if (!bar) continue;
    bar.count += 1;
    bar.words += countWords(entry.body);
  }
  return bars;
}

function createBuckets(period: StatsPeriod, anchor: Date): StatsBar[] {
  if (period === "year") {
    return Array.from({ length: 12 }, (_, monthIndex) => ({
      key: `${anchor.getFullYear()}-${String(monthIndex + 1).padStart(2, "0")}`,
      label: String(monthIndex + 1),
      count: 0,
      words: 0,
    }));
  }

  if (period === "week") {
    const offset = (anchor.getDay() + 6) % 7;
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - offset);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        key: isoDate(date),
        label: "一二三四五六日"[index],
        count: 0,
        words: 0,
      };
    });
  }

  const days = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  return Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    return {
      key: `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      label: String(day),
      count: 0,
      words: 0,
    };
  });
}

function bucketKey(period: StatsPeriod, date: string): string {
  return period === "year" ? date.slice(0, 7) : date;
}

function isoDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function countWords(text: string): number {
  return Array.from(text.matchAll(/[\p{Script=Han}\p{L}\p{N}]/gu)).length;
}
