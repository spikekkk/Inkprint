import { ItemView, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_ZHENSHANGSHU } from "../constants";
import type { SettingsStore } from "../services/SettingsStore";
import { DailyNoteService } from "../services/DailyNoteService";
import { GoalService } from "../services/GoalService";
import { LongformService } from "../services/LongformService";
import { AppShell } from "../ui/AppShell";
import { JournalPage } from "../ui/JournalPage";

export { VIEW_TYPE_ZHENSHANGSHU } from "../constants";

export class ZhenshangshuView extends ItemView {
  private shell: AppShell | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly settingsStore: SettingsStore,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_ZHENSHANGSHU;
  }

  getDisplayText(): string {
    return "枕上书";
  }

  getIcon(): string {
    return "notebook-pen";
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    const settings = await this.settingsStore.load();
    this.shell = new AppShell({
      app: this.app,
      vault: this.app.vault,
      container: this.contentEl,
      settings,
      services: {
        daily: new DailyNoteService(this.app.vault, settings),
        goals: new GoalService(this.app.vault, { goalsPath: settings.goalsPath }),
        longform: new LongformService(this.app.vault, {
          longformFolder: settings.longformFolder,
        }),
      },
    });
    const journal = new JournalPage(this.shell, settings);
    this.shell.registerPage("journal", (container) => journal.render(container));
    this.shell.mount();
  }

  async onClose(): Promise<void> {
    this.shell?.dispose();
    this.shell = null;
  }
}
