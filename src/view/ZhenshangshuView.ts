import { ItemView, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_ZHENSHANGSHU } from "../constants";
import type { SettingsStore } from "../services/SettingsStore";
import { DailyNoteService } from "../services/DailyNoteService";
import { GoalService } from "../services/GoalService";
import { LongformService } from "../services/LongformService";
import { AppShell } from "../ui/AppShell";
import { ContentPage } from "../ui/ContentPage";
import { GoalPage } from "../ui/GoalPage";
import { JournalPage } from "../ui/JournalPage";
import { SearchPage } from "../ui/SearchPage";
import { CheckinService } from "../services/CheckinService";

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
    this.shell?.dispose();
    this.shell = null;
    this.contentEl.empty();
    const settings = await this.settingsStore.load();
    const daily = new DailyNoteService(this.app.vault, settings);
    this.shell = new AppShell({
      app: this.app,
      vault: this.app.vault,
      container: this.contentEl,
      settings,
      services: {
        daily,
        checkin: new CheckinService(daily),
        goals: new GoalService(this.app.vault, { goalsPath: settings.goalsPath }),
        longform: new LongformService(this.app.vault, {
          longformFolder: settings.longformFolder,
        }),
      },
    });
    const journal = new JournalPage(this.shell, settings);
    const goals = new GoalPage(this.shell);
    const content = new ContentPage(this.shell);
    const search = new SearchPage(this.shell);
    this.shell.registerPage("journal", (container) => journal.render(container));
    this.shell.registerPage("checkin", (container) => goals.render(container));
    this.shell.registerPage("content", (container) => content.render(container));
    this.shell.registerPage("search", (container) => search.render(container));
    this.shell.mount();
  }

  async onClose(): Promise<void> {
    this.shell?.dispose();
    this.shell = null;
  }

  async refresh(): Promise<void> {
    await this.onOpen();
  }
}
