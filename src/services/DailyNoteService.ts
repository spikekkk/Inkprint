import { normalizePath, type Vault } from "obsidian";
import { serializeDailyEntry } from "../domain/dailyEntry";
import type { DailyEntry, DailyEntryInput } from "../domain/types";

export interface DailyNoteConfig {
  dailyFolder: string;
  dailyHeading: string;
}

export class DailyNoteService {
  constructor(
    private readonly vault: Vault,
    private readonly config: DailyNoteConfig,
  ) {}

  async append(dateKey: string, input: DailyEntryInput): Promise<DailyEntry> {
    if (!input.body.trim()) {
      throw new Error("Cannot save an empty Daily entry.");
    }

    const folder = normalizePath(this.config.dailyFolder);
    const filePath = normalizePath(`${folder}/${dateKey}.md`);
    await this.ensureFolder(folder);

    let file = this.vault.getFileByPath(filePath);
    if (!file) {
      const initial = this.config.dailyHeading.trim()
        ? `${this.config.dailyHeading.trim()}\n\n`
        : "";
      file = await this.vault.create(filePath, initial);
    }

    await this.vault.append(file, serializeDailyEntry(input));
    return { ...input, blockId: input.entryId };
  }

  async read(dateKey: string): Promise<string> {
    const filePath = normalizePath(`${this.config.dailyFolder}/${dateKey}.md`);
    const file = this.vault.getFileByPath(filePath);
    return file ? this.vault.cachedRead(file) : "";
  }

  private async ensureFolder(path: string): Promise<void> {
    if (!path) return;
    const parts = path.split("/").filter(Boolean);
    let current = "";

    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      const existing = this.vault.getAbstractFileByPath(current);
      if (existing) {
        if (existing instanceof Object && "children" in existing) continue;
        throw new Error(`A file blocks the required folder path: ${current}`);
      }
      await this.vault.createFolder(current);
    }
  }
}
