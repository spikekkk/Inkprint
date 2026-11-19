import type { Plugin } from "obsidian";
import {
  normalizeSettings,
  type InkprintSettings,
} from "../settings/defaults";

export class SettingsStore {
  private current: InkprintSettings | null = null;

  constructor(private readonly plugin: Plugin) {}

  async load(): Promise<InkprintSettings> {
    if (!this.current) {
      this.current = normalizeSettings(await this.plugin.loadData());
    }
    return { ...this.current };
  }

  getCached(): InkprintSettings | null {
    return this.current ? { ...this.current } : null;
  }

  async save(next: InkprintSettings): Promise<void> {
    const normalized = normalizeSettings(next);
    await this.plugin.saveData(normalized);
    this.current = normalized;
  }
}
