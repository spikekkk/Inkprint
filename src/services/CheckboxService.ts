import { normalizePath, type TFile, type Vault } from "obsidian";
import { t } from "../i18n";

export interface DailyCheckbox {
  lineIndex: number;
  checked: boolean;
  text: string;
  dueDate?: string;
}

export interface CheckboxCandidate extends DailyCheckbox {
  date: string;
  filePath: string;
}

export class CheckboxService {
  constructor(
    private readonly vault: Vault,
    private readonly config: { dailyFolder: string; dailyHeading: string },
  ) {}

  async listForDay(dateKey: string): Promise<DailyCheckbox[]> {
    const file = this.getFile(dateKey);
    if (!file) return [];
    return extractDailyCheckboxes(await this.vault.cachedRead(file));
  }

  async listSources(): Promise<CheckboxCandidate[]> {
    const folder = normalizePath(this.config.dailyFolder);
    const files = this.vault
      .getFiles()
      .filter((file) => file.extension === "md" && file.path.startsWith(`${folder}/`))
      .sort((first, second) => second.basename.localeCompare(first.basename));
    const candidates: CheckboxCandidate[] = [];

    for (const file of files) {
      const markdown = await this.vault.cachedRead(file);
      for (const item of extractDailyCheckboxes(markdown)) {
        candidates.push({
          ...item,
          date: file.basename,
          filePath: file.path,
        });
      }
    }
    return candidates;
  }

  async appendToDay(dateKey: string, items: readonly DailyCheckbox[]): Promise<void> {
    if (!items.length) return;
    const file = await this.ensureFile(dateKey);
    const lines = items.map(
      (item) => `- [${item.checked ? "x" : " "}] ${item.text.trim()}`,
    );
    const block = `${this.config.dailyHeading ? `\n${this.config.dailyHeading}\n\n` : "\n"}${lines.join("\n")}\n`;
    await this.vault.append(file, block);
  }

  async setChecked(
    dateKey: string,
    lineIndex: number,
    checked: boolean,
  ): Promise<void> {
    const file = this.getFile(dateKey);
    if (!file) throw new Error(t("error.checkboxFileMissing"));
    await this.vault.process(file, (markdown) => {
      const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
      const line = lines[lineIndex];
      if (!line) throw new Error(t("error.checkboxMoved"));
      lines[lineIndex] = line.replace(
        /^(\s*[-*+]\s+)\[([ xX])\]/,
        `$1[${checked ? "x" : " "}]`,
      );
      return lines.join("\n");
    });
  }

  private getFile(dateKey: string): TFile | null {
    return this.vault.getFileByPath(this.pathFor(dateKey));
  }

  private async ensureFile(dateKey: string): Promise<TFile> {
    const existing = this.getFile(dateKey);
    if (existing) return existing;
    const path = this.pathFor(dateKey);
    const slash = path.lastIndexOf("/");
    if (slash >= 0) await this.ensureFolder(path.slice(0, slash));
    return this.vault.create(path, "");
  }

  private pathFor(dateKey: string): string {
    return normalizePath(`${this.config.dailyFolder}/${dateKey}.md`);
  }

  private async ensureFolder(path: string): Promise<void> {
    let current = "";
    for (const part of path.split("/").filter(Boolean)) {
      current = current ? `${current}/${part}` : part;
      if (this.vault.getAbstractFileByPath(current)) continue;
      await this.vault.createFolder(current);
    }
  }
}

export function extractDailyCheckboxes(markdown: string): DailyCheckbox[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const checkboxes: DailyCheckbox[] = [];
  let fence: string | null = null;

  lines.forEach((line, lineIndex) => {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) {
      fence = fence === null ? marker[0] : fence === marker[0] ? null : fence;
      return;
    }
    if (fence !== null) return;
    const match = /^\s*[-*+]\s+\[([ xX])\]\s+(.+?)\s*$/.exec(line);
    if (!match) return;
    const dueDate = /(?:^|\s)@(\d{4}-\d{2}-\d{2})(?:\s|$)/.exec(match[2])?.[1];
    checkboxes.push({
      lineIndex,
      checked: match[1].toLowerCase() === "x",
      text: match[2],
      ...(dueDate ? { dueDate } : {}),
    });
  });

  return checkboxes;
}
