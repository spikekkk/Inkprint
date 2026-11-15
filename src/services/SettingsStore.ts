import type { Plugin } from "obsidian";
import {
  normalizeSettings,
  type ZhenshangshuSettings,
} from "../settings/defaults";

export class SettingsStore {
  private current: ZhenshangshuSettings | null = null;

  constructor(private readonly plugin: Plugin) {}

  async load(): Promise<ZhenshangshuSettings> {
    if (!this.current) {
      this.current = normalizeSettings(await this.plugin.loadData());
    }
    return { ...this.current };
  }

  async save(next: ZhenshangshuSettings): Promise<void> {
    const normalized = normalizeSettings(next);
    await this.plugin.saveData(normalized);
    this.current = normalized;
  }
}
